export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          ip: string | null
          product_id: string | null
          qty: number | null
          reason: string | null
          user_id: string | null
          value_after: Json | null
          value_before: Json | null
          warehouse_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          product_id?: string | null
          qty?: number | null
          reason?: string | null
          user_id?: string | null
          value_after?: Json | null
          value_before?: Json | null
          warehouse_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          product_id?: string | null
          qty?: number | null
          reason?: string | null
          user_id?: string | null
          value_after?: Json | null
          value_before?: Json | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name_ar: string
          name_en: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
        }
        Update: {
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      doc_counters: {
        Row: {
          prefix: string
          seq: number
          year: number
        }
        Insert: {
          prefix: string
          seq?: number
          year: number
        }
        Update: {
          prefix?: string
          seq?: number
          year?: number
        }
        Relationships: []
      }
      inventory_count_items: {
        Row: {
          actual_qty: number | null
          book_qty: number
          count_id: string
          id: string
          notes: string | null
          product_id: string
        }
        Insert: {
          actual_qty?: number | null
          book_qty?: number
          count_id: string
          id?: string
          notes?: string | null
          product_id: string
        }
        Update: {
          actual_qty?: number | null
          book_qty?: number
          count_id?: string
          id?: string
          notes?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_items_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          doc_no: string
          id: string
          notes: string | null
          rack: string | null
          scope: string
          started_at: string
          status: Database["public"]["Enums"]["count_status"]
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          doc_no: string
          id?: string
          notes?: string | null
          rack?: string | null
          scope?: string
          started_at?: string
          status?: Database["public"]["Enums"]["count_status"]
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          doc_no?: string
          id?: string
          notes?: string | null
          rack?: string | null
          scope?: string
          started_at?: string
          status?: Database["public"]["Enums"]["count_status"]
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_voucher_items: {
        Row: {
          id: string
          notes: string | null
          product_id: string
          qty: number
          voucher_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          product_id: string
          qty: number
          voucher_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          product_id?: string
          qty?: number
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_voucher_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_voucher_items_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "issue_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_vouchers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          doc_date: string
          doc_no: string
          id: string
          notes: string | null
          reason: string | null
          recipient: string | null
          status: Database["public"]["Enums"]["doc_status"]
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string
          doc_no: string
          id?: string
          notes?: string | null
          reason?: string | null
          recipient?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string
          doc_no?: string
          id?: string
          notes?: string | null
          reason?: string | null
          recipient?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_vouchers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_barcodes: {
        Row: {
          barcode: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          barcode: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          barcode?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_barcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_active: boolean
          max_qty: number | null
          min_qty: number
          name_ar: string
          name_en: string | null
          notes: string | null
          purchase_price: number
          sku: string
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_qty?: number | null
          min_qty?: number
          name_ar: string
          name_en?: string | null
          notes?: string | null
          purchase_price?: number
          sku: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_qty?: number | null
          min_qty?: number
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          purchase_price?: number
          sku?: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_receipt_items: {
        Row: {
          batch_no: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          product_id: string
          qty: number
          receipt_id: string
          unit_price: number
        }
        Insert: {
          batch_no?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id: string
          qty: number
          receipt_id: string
          unit_price?: number
        }
        Update: {
          batch_no?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          qty?: number
          receipt_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          doc_date: string
          doc_no: string
          id: string
          invoice_no: string | null
          notes: string | null
          status: Database["public"]["Enums"]["doc_status"]
          supplier_id: string | null
          total_amount: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string
          doc_no: string
          id?: string
          invoice_no?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string
          doc_no?: string
          id?: string
          invoice_no?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          id: string
          location_id: string | null
          opening_qty: number
          product_id: string
          qty: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          location_id?: string | null
          opening_qty?: number
          product_id: string
          qty?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          location_id?: string | null
          opening_qty?: number
          product_id?: string
          qty?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          counterparty_warehouse_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          qty: number
          qty_after: number
          qty_before: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["movement_type"]
          unit_price: number
          warehouse_id: string
        }
        Insert: {
          counterparty_warehouse_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          qty: number
          qty_after?: number
          qty_before?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["movement_type"]
          unit_price?: number
          warehouse_id: string
        }
        Update: {
          counterparty_warehouse_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          qty?: number
          qty_after?: number
          qty_before?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["movement_type"]
          unit_price?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_counterparty_warehouse_id_fkey"
            columns: ["counterparty_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      transfer_items: {
        Row: {
          id: string
          product_id: string
          receive_notes: string | null
          received_qty: number
          request_notes: string | null
          requested_qty: number
          send_notes: string | null
          sent_qty: number
          transfer_id: string
        }
        Insert: {
          id?: string
          product_id: string
          receive_notes?: string | null
          received_qty?: number
          request_notes?: string | null
          requested_qty?: number
          send_notes?: string | null
          sent_qty?: number
          transfer_id: string
        }
        Update: {
          id?: string
          product_id?: string
          receive_notes?: string | null
          received_qty?: number
          request_notes?: string | null
          requested_qty?: number
          send_notes?: string | null
          sent_qty?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          approval_notes: string | null
          approved_by: string | null
          branch_review: string | null
          created_at: string
          doc_date: string
          doc_no: string
          driver_name: string | null
          from_warehouse_id: string
          id: string
          received_at: string | null
          receiver_name: string | null
          rejection_reason: string | null
          request_notes: string | null
          requested_by: string | null
          sender_name: string | null
          shipped_at: string | null
          status: Database["public"]["Enums"]["doc_status"]
          to_warehouse_id: string
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_by?: string | null
          branch_review?: string | null
          created_at?: string
          doc_date?: string
          doc_no: string
          driver_name?: string | null
          from_warehouse_id: string
          id?: string
          received_at?: string | null
          receiver_name?: string | null
          rejection_reason?: string | null
          request_notes?: string | null
          requested_by?: string | null
          sender_name?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          to_warehouse_id: string
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_by?: string | null
          branch_review?: string | null
          created_at?: string
          doc_date?: string
          doc_no?: string
          driver_name?: string | null
          from_warehouse_id?: string
          id?: string
          received_at?: string | null
          receiver_name?: string | null
          rejection_reason?: string | null
          request_notes?: string | null
          requested_by?: string | null
          sender_name?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          to_warehouse_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_warehouses: {
        Row: {
          created_at: string
          id: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_locations: {
        Row: {
          aisle: string | null
          bin: string | null
          created_at: string
          id: string
          label: string
          rack: string | null
          warehouse_id: string
          zone: string | null
        }
        Insert: {
          aisle?: string | null
          bin?: string | null
          created_at?: string
          id?: string
          label: string
          rack?: string | null
          warehouse_id: string
          zone?: string | null
        }
        Update: {
          aisle?: string | null
          bin?: string | null
          created_at?: string
          id?: string
          label?: string
          rack?: string | null
          warehouse_id?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          manager_name: string | null
          manager_phone: string | null
          name_ar: string
          name_en: string
          type: Database["public"]["Enums"]["warehouse_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name_ar: string
          name_en: string
          type?: Database["public"]["Enums"]["warehouse_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name_ar?: string
          name_en?: string
          type?: Database["public"]["Enums"]["warehouse_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_count: { Args: { _id: string }; Returns: undefined }
      approve_issue: { Args: { _id: string }; Returns: undefined }
      approve_receipt: { Args: { _id: string }; Returns: undefined }
      approve_transfer: {
        Args: { _id: string; _notes?: string }
        Returns: undefined
      }
      can_access_warehouse: {
        Args: { _user_id: string; _warehouse_id: string }
        Returns: boolean
      }
      can_write: { Args: { _user_id: string }; Returns: boolean }
      current_balance: {
        Args: { _product: string; _warehouse: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _entity: string
          _entity_id: string
          _reason: string
          _warehouse_id: string
        }
        Returns: undefined
      }
      next_doc_no: { Args: { _prefix: string }; Returns: string }
      notify_admins: {
        Args: { _body: string; _link: string; _title: string }
        Returns: undefined
      }
      receive_transfer: {
        Args: { _id: string; _receiver: string; _review?: string }
        Returns: undefined
      }
      reject_transfer: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      ship_transfer: {
        Args: { _driver: string; _id: string; _sender: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "warehouse_manager"
        | "main_warehouse"
        | "branch_warehouse"
        | "auditor"
        | "viewer"
      count_status: "draft" | "in_progress" | "completed" | "approved"
      doc_status:
        | "draft"
        | "pending"
        | "approved"
        | "preparing"
        | "shipped"
        | "received"
        | "completed"
        | "rejected"
        | "cancelled"
      movement_type:
        | "opening"
        | "receipt"
        | "issue"
        | "transfer_out"
        | "transfer_in"
        | "adjustment"
      warehouse_type: "main" | "branch"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "warehouse_manager",
        "main_warehouse",
        "branch_warehouse",
        "auditor",
        "viewer",
      ],
      count_status: ["draft", "in_progress", "completed", "approved"],
      doc_status: [
        "draft",
        "pending",
        "approved",
        "preparing",
        "shipped",
        "received",
        "completed",
        "rejected",
        "cancelled",
      ],
      movement_type: [
        "opening",
        "receipt",
        "issue",
        "transfer_out",
        "transfer_in",
        "adjustment",
      ],
      warehouse_type: ["main", "branch"],
    },
  },
} as const
