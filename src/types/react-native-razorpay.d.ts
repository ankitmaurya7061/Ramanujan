declare module "react-native-razorpay" {
  export type RazorpayCheckoutOptions = {
    description?: string;
    image?: string;
    currency: string;
    key: string;
    amount: string;
    name: string;
    order_id?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
  };

  export type RazorpayCheckoutSuccess = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open(
      options: RazorpayCheckoutOptions
    ): Promise<RazorpayCheckoutSuccess>;
  };

  export default RazorpayCheckout;
}
