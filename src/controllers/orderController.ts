import { Request, Response } from 'express'
import { db } from '../config/database'

class OrderController {
  public createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, items, shipping_address, payment_method } = req.body
      
      // Validate input
      if (!user_id || !items || !shipping_address) {
        res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc'
        })
        return
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
      
      await db.transaction().execute(async (trx) => {
        // Calculate total amount
        const totalAmount = items.reduce((sum: number, item: any) => {
          return sum + (item.price * item.quantity)
        }, 0)

        // Create order
        const order = await trx.insertInto('orders')
          .values({
            user_id,
            total_amount: totalAmount,
            shipping_address,
            payment_method,
            created_at: timestamp,
            updated_at: timestamp
          })
          .executeTakeFirst()

        // Add order items
        await trx.insertInto('order_items')
          .values(items.map((item: any) => ({
            order_id: Number(order.insertId), // Convert BigInt to Number
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            created_at: timestamp
          })))
          .execute()

        res.status(201).json({
          success: true,
          message: 'Tạo đơn hàng thành công',
          data: { order_id: Number(order.insertId) } // Convert BigInt to Number
        })
      })
    } catch (error) {
      console.error('Create order error:', error)
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
        .execute()

      // Then get items for each order
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

        return {
          ...order,
          items
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

}

export default new OrderController()