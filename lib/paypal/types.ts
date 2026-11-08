export interface PayPalOAuthResponse {
  scope: string;
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  nonce: string;
}

export interface PayPalCreateOrderRequest {
  intent: "CAPTURE";
  purchase_units: Array<{
    reference_id: string;
    description: string;
    amount: {
      currency_code: string;
      value: string;
    };
  }>;
  application_context: {
    brand_name: string;
    landing_page: "LOGIN" | "BILLING" | "NO_PREFERENCE";
    user_action: "PAY_NOW" | "CONTINUE";
    return_url: string;
    cancel_url: string;
  };
}

export interface PayPalOrderResponse {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalCaptureResponse {
  id: string;
  status: "COMPLETED" | "DECLINED" | "FAILED";
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: {
          value: string;
          currency_code: string;
        };
        create_time: string;
      }>;
    };
  }>;
}
