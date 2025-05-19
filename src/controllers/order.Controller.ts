import { Request, Response } from 'express'
import { db } from '../config/database'

class OrderController {
  public createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, items, shipping_address, payment_method ,phone ,name } = req.body
      console.log('Received request body:', req.body);
      // Validate input
      if (  !items || !shipping_address) {
        res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc'
        })
        return
      }

      // Combine duplicate items and sum their quantities
      console.log('1. Combining duplicate items');
      const combinedItems = items.reduce((acc: any[], item: any) => {
        const existingItem = acc.find(i => i.product_id === item.product_id);
        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          acc.push({...item});
        }
        return acc;
      }, []);

      console.log('Combined items:', combinedItems);

      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
      
      await db.transaction().execute(async (trx) => {
        // Check stock availability for all products
        console.log('2. Checking stock availability');
        for (const item of combinedItems) {
          const product = await trx
            .selectFrom('products')
            .select(['id', 'stock', 'name'])
            .where('id', '=', item.product_id)
            .executeTakeFirst();

          if (!product) {
            throw new Error(`Sản phẩm với ID ${item.product_id} không tồn tại`);
          }

          if (product.stock < item.quantity) {
            throw new Error(`Sản phẩm ${product.name} chỉ còn ${product.stock} trong kho`);
          }
        }

        // Calculate total amount
        console.log('3. Calculating total amount');
        const totalAmount = combinedItems.reduce((sum: number, item: any) => {
          return sum + (Number(item.price) * item.quantity)
        }, 0)

        // Create order
        console.log('4. Creating order');
        // Add interface for order item type
        interface OrderItem {
          product_id: number;
          quantity: number;
          price: number;
          phone?: string;
          name?: string;
        }
        
        // In your method:
        const { insertId } = await trx.insertInto('orders')
          .values({
            user_id,
            total_amount: totalAmount,
            shipping_address,
            payment_method,
            phone,
            name,
            created_at: timestamp,
            updated_at: timestamp
          })
          .executeTakeFirstOrThrow();
        
        const order = { id: insertId };
        // Fix the mapping with proper types
        await trx.insertInto('order_items')
          .values(
            combinedItems.map((item: OrderItem) => ({
              order_id: order.id,
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              created_at: timestamp,
            
            }))
          )
          .execute();
        
        // Update product stock
        console.log('6. Updating product stock');
        for (const item of combinedItems) {
          await trx
            .updateTable('products')
            .set((eb) => ({
              stock: eb('stock', '-', item.quantity),
              updated_at: timestamp
            }))
            .where('id', '=', item.product_id)
            .execute();
        }

        console.log('7. Order completed successfully');
        res.status(201).json({
          success: true,
          message: 'Tạo đơn hàng thành công',
          data: { 
            order_id: Number(order.id),
            items: combinedItems
          }
        })
      })
    } catch (error: any) {
      console.error('Create order error:', error);
      
      // Handle specific errors
      if (error.message && (
        error.message.includes('không tồn tại') || 
        error.message.includes('trong kho')
      )) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Không thể tạo đơn hàng'
      })
    }
  }

  public getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
      // First get all orders with user info
      const orders = await db.selectFrom('orders')
        .leftJoin('users', 'users.id', 'orders.user_id')
        .select([
          'orders.id',
          'orders.user_id',
          'orders.name as order_name',
          'orders.total_amount',
          'orders.status',
          'orders.phone as order_phone',
          'orders.shipping_address',
          'orders.created_at',
          'users.phone as user_phone',
          'users.name as user_name',
          'users.email as user_email',
        ])
        .execute()
        console.log('Orders:', orders);
      // Then get items for each order and combine duplicates
      const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await db.selectFrom('order_items')
          .innerJoin('products', 'products.id', 'order_items.product_id')
          .leftJoin('product_images', 'product_images.product_id', 'products.id')
          .where('order_items.order_id', '=', order.id)
          .select([
            'order_items.product_id',
            'products.name as product_name',
            'order_items.quantity',
            'order_items.price',
            'products.main_image_url'
          ])
          .execute()
         console.log('Items for order', order.id, ':', items);
        // Combine duplicate items
        const combinedItems = items.reduce((acc: any[], item: any) => {
          const existingItem = acc.find(i => i.product_id === item.product_id);
          if (existingItem) {
            existingItem.quantity += item.quantity;
            existingItem.total_price = String(Number(existingItem.price) * existingItem.quantity);
          } else {
            acc.push({
              ...item,
              total_price: String(Number(item.price) * item.quantity)
            });
          }
          return acc;
        }, []);

        // Convert status to display text
        let statusDisplay = '';
        switch (order.status) {
          case 'pending':
            statusDisplay = 'Đang chờ xử lý';
            break;
          case 'processing':
            statusDisplay = 'Đang xử lý';
            break;
          case 'shipped':
            statusDisplay = 'Đang giao hàng';
            break;
          case 'delivered':
            statusDisplay = 'Đã hoàn thành';
            break;
          case 'cancelled':
            statusDisplay = 'Đã hủy';
            break;
          default:
            statusDisplay = order.status;
        }

        return {
          ...order,
          status_display: statusDisplay,
          items: combinedItems,
          total_items: combinedItems.reduce((sum, item) => sum + item.quantity, 0)
        }
      }))

      res.status(200).json({
        success: true,
        data: ordersWithItems
      })
    } catch (error) {
      console.error('Get orders error:', error)
      res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách đơn hàng'
      })
    }
  }
  public getOrdersByUserId = async (req: Request, res: Response): Promise<void> => {
      try {
          const { userId } = req.params;
  
          // Validate userId
          if (!userId || isNaN(Number(userId))) {
              res.status(400).json({
                  success: false,
                  message: 'ID người dùng không hợp lệ'
              });
              return;
          }
  
          // Get orders for specific user
          const orders = await db.selectFrom('orders')
              .innerJoin('users', 'users.id', 'orders.user_id')
              .select([
                  'orders.id',
                  'orders.user_id',
                  'orders.total_amount',
                  'orders.status',
                  'orders.shipping_address',
                  'orders.created_at',
                  'users.name as user_name',
                  'users.email as user_email'
              ])
              .where('orders.user_id', '=', Number(userId))
              .execute();
  
      // Then get items for each order and combine duplicates
      const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await db.selectFrom('order_items')
          .innerJoin('products', 'products.id', 'order_items.product_id')
          .leftJoin('product_images', 'product_images.product_id', 'products.id')
          .where('order_items.order_id', '=', order.id)
          .select([
            'order_items.product_id',
            'products.name as product_name',
            'order_items.quantity',
            'order_items.price',
            'products.main_image_url'
          ])
          .execute();
  
        // Combine duplicate items
        const combinedItems = items.reduce((acc: any[], item: any) => {
          const existingItem = acc.find(i => i.product_id === item.product_id);
          if (existingItem) {
            existingItem.quantity += item.quantity;
            existingItem.total_price = String(Number(existingItem.price) * existingItem.quantity);
          } else {
            acc.push({
              ...item,
              total_price: String(Number(item.price) * item.quantity)
            });
          }
          return acc;
        }, []);
  
        // Convert status to display text
        let statusDisplay = '';
        switch (order.status) {
          case 'pending':
            statusDisplay = 'Đang chờ xử lý'; break;
          case 'processing':
            statusDisplay = 'Đang xử lý'; break;
          case 'shipped':
            statusDisplay = 'Đang giao hàng'; break;
          case 'delivered':
            statusDisplay = 'Đã hoàn thành'; break;
          case 'cancelled':
            statusDisplay = 'Đã hủy'; break;
          default:
            statusDisplay = order.status;
        }
  
        return {
          ...order,
          status_display: statusDisplay,
          items: combinedItems,
          total_items: combinedItems.reduce((sum, item) => sum + item.quantity, 0)
        };
      }));
  
      res.status(200).json({
        success: true,
        data: ordersWithItems
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách đơn hàng'
      });
    }
  };
  
  public deleteOrder = async (req: Request, res: Response): Promise<void> => {
      try {
          const { id } = req.params;
          
          
          // Check if order exists
          const order = await db.selectFrom('orders')
              .select('id')
              .where('id', '=', id)
              .executeTakeFirst();
              
          if (!order) {
              res.status(404).json({
                  success: false,
                  message: 'Không tìm thấy đơn hàng'
              });
              return;
          }
                  // Delete the order
        await db.deleteFrom('orders')
        .where('id', '=', id)
        .execute();
        
          res.status(200).json({
              success: true,
              message: 'Xóa đơn hàng thành công'
          });
      } catch (error) {
          console.error('Delete order error:', error);
          res.status(500).json({
              success: false,
              message: 'Không thể xóa đơn hàng'
          });
      }
  }

  public updateOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      console.log('1. Update order request:', { orderId: id, newStatus: status });

      // Validate status
      const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
      
      if (!status || !validStatuses.includes(status)) {
        console.log('2. Invalid status:', status);
        res.status(400).json({
          success: false,
          message: 'Trạng thái đơn hàng không hợp lệ. Trạng thái hợp lệ: Đang chờ xử lý, Đang xử lý, Đang giao hàng, Đã hoàn thành, Đã hủy'
        });
        return;
      }

      // Check if order exists
      console.log('3. Checking order existence');
      const order = await db.selectFrom('orders')
        .select(['id', 'status'])
        .where('id', '=', Number(id))
        .executeTakeFirst();

      if (!order) {
        console.log('4. Order not found');
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
        return;
      }

      // Get status display text
      let statusDisplay = '';
      switch (status) {
        case 'pending':
          statusDisplay = 'Đang chờ xử lý';
          break;
        case 'processing':
          statusDisplay = 'Đang xử lý';
          break;
        case 'shipped':
          statusDisplay = 'Đang giao hàng';
          break;
        case 'delivered':
          statusDisplay = 'Đã hoàn thành';
          break;
        case 'cancelled':
          statusDisplay = 'Đã hủy';
          break;
      }

      // If order is being cancelled, we need to restore product stock
      if (status === 'cancelled' && order.status !== 'cancelled') {
        console.log('5. Cancelling order, restoring stock');
        await db.transaction().execute(async (trx) => {
          // Get order items
          const orderItems = await trx
            .selectFrom('order_items')
            .select(['product_id', 'quantity'])
            .where('order_id', '=', Number(id))
            .execute();

          const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

          // Restore stock for each item
          for (const item of orderItems) {
            await trx
              .updateTable('products')
              .set((eb) => ({
                stock: eb('stock', '+', item.quantity),
                updated_at: timestamp
              }))
              .where('id', '=', item.product_id)
              .execute();
          }

          // Update order status
          await trx
            .updateTable('orders')
            .set({
              status,
              updated_at: timestamp
            })
            .where('id', '=', Number(id))
            .execute();
        });
      } else {
        // Regular status update
        console.log('5. Updating order status');
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.updateTable('orders')
          .set({
            status,
            updated_at: timestamp
          })
          .where('id', '=', Number(id))
          .execute();
      }

      // Get updated order details
      console.log('6. Fetching updated order details');
      const updatedOrder = await db.selectFrom('orders')
        .innerJoin('users', 'users.id', 'orders.user_id')
        .select([
          'orders.id',
          'orders.user_id',
          'orders.total_amount',
          'orders.status',
          'orders.shipping_address',
          'orders.created_at',
          'orders.updated_at',
          'users.name as user_name',
          'users.email as user_email'
        ])
        .where('orders.id', '=', Number(id))
        .executeTakeFirst();

      // Get order items
      const items = await db.selectFrom('order_items')
        .innerJoin('products', 'products.id', 'order_items.product_id')
        .where('order_items.order_id', '=', Number(id))
        .select([
          'order_items.product_id',
          'products.name as product_name',
          'order_items.quantity',
          'order_items.price'
        ])
        .execute();

      console.log('7. Order updated successfully');
      res.status(200).json({
        success: true,
        message: `Cập nhật trạng thái đơn hàng thành ${statusDisplay}`,
        data: {
          ...updatedOrder,
          status_display: statusDisplay,
          items
        }
      });

    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể cập nhật đơn hàng'
      });
    }
  }
}

export default new OrderController()