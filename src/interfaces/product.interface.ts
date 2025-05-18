export interface ProductImage {
    id?: number;
    product_id: number;
    image_url: string;
    sort_order: number;
    created_at?: Date;
}

export interface Product {
    id?: number;
    name: string;
    description?: string;
    price: number;
    category_id?: number;
    main_image_url?: string;
    stock: number;
    is_active?: boolean;
    sku?: string;
    weight?: number;
    manufacturer_id?: number;
    dimensions?: string;
    created_at?: Date;
    updated_at?: Date;
    images?: ProductImage[];
}

export interface CreateProductDTO extends Omit<Product, 'id' | 'created_at' | 'updated_at' | 'images'> {
    images?: Array<{
        image_url: string;
        sort_order?: number;
    }>;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
    id: number;
}


export interface ProductDetail {
    id?: number;
    product_id: number;
    title: string;
    description: string;
    created_at?: Date;
}

export interface Warranty {
    id?: number;
    product_id: number;
    duration: string;
    description: string;
    created_at?: Date;
}

export interface ProductCategory {
    id?: number;
    product_id: number;
    category_id: number;
    created_at?: Date;
}