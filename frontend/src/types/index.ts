export enum RolEnum {
  ADMIN = "admin",
  CLIENTE = "cliente"
}

export enum TipoMotoCCEnum {
  HASTA_99CC = "hasta_99cc",
  DE_100_200CC = "100_200cc"
}

export interface Usuario {
  id: number;
  email: string;
  nombre_completo: string;
  rol: RolEnum;
  activo: number;
  fecha_creacion: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

export interface Bolsa {
  id: number;
  saldo_actual: number;
  fecha_actualizacion: string;
}

export interface Recarga {
  id: number;
  monto: number;
  referencia?: string;
  observaciones?: string;
  documento_comprobante?: string;
  fecha_recarga: string;
  usuario_registro_id: number;
}

export interface RecargaCreate {
  monto: number;
  referencia?: string;
  observaciones?: string;
}

export interface SoatExpedido {
  id: number;
  placa: string;
  cedula: string;
  nombre_propietario: string;
  tipo_moto: TipoMotoCCEnum;
  valor_soat: number;
  comision: number;
  total: number;
  observaciones?: string;
  documento_factura?: string;
  documento_soat?: string;
  documento_poliza?: string;
  fecha_expedicion: string;
  usuario_registro_id: number;
}

export interface SoatExpedidoCreate {
  placa: string;
  cedula: string;
  nombre_propietario: string;
  tipo_moto: TipoMotoCCEnum;
  observaciones?: string;
}

export interface DashboardStats {
  saldo_actual: number;
  total_soats_expedidos: number;
  total_comisiones_generadas: number;
  total_recargas: number;
  soats_hoy: number;
}
