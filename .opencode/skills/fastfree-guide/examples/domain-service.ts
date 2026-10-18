import { api } from 'fastfree-auth';

export interface OrderItem {
  item_code: string;
  qty: number;
  rate: number;
}

export interface SalesOrder {
  name?: string;
  customer: string;
  transaction_date: string;
  items: OrderItem[];
  docstatus?: 0 | 1 | 2;
}

export class OrderService {
  private static readonly DOCTYPE = 'Sales Order';

  static async getOrders(): Promise<SalesOrder[]> {
    const response = await api.getDocList<SalesOrder>(this.DOCTYPE, {
      fields: ['name', 'customer', 'transaction_date', 'docstatus'],
      limit_page_length: 50,
      order_by: 'creation desc',
    });
    return response ?? [];
  }

  static async getOrder(name: string): Promise<SalesOrder> {
    return await api.getDoc<SalesOrder>(this.DOCTYPE, name);
  }

  static async createOrder(order: SalesOrder): Promise<SalesOrder> {
    return await api.createDoc<SalesOrder>(this.DOCTYPE, order);
  }

  static async submitOrder(name: string): Promise<SalesOrder> {
    return await api.submitDoc<SalesOrder>(this.DOCTYPE, name);
  }
}
