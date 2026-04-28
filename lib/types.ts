export type Role = "owner" | "employee";
export type VehicleType = "auto" | "camioneta" | "moto";
export type PaymentMethod = "efectivo" | "transferencia";
export type WashStatus = "pending" | "completed";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  created_at: string;
}

export interface Client {
  id: string;
  phone: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  type: VehicleType;
  created_at: string;
}

export interface ClientVehicle {
  client_id: string;
  vehicle_id: string;
}

export interface WashRecord {
  id: string;
  employee_id: string;
  client_id: string;
  vehicle_id: string;
  wash_date: string;
  wash_time: string;
  payment_method: PaymentMethod;
  amount: number;
  detail: string | null;
  status: WashStatus;
  created_at: string;
  // joined
  client?: Client;
  vehicle?: Vehicle;
  employee?: Profile;
}

export interface WashRecordWithDetails extends WashRecord {
  clients: Client;
  vehicles: Vehicle;
  profiles: Profile;
}
