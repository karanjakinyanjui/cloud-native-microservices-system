/**
 * Email notification templates
 * These templates use Handlebars syntax for variable substitution
 */

export const emailTemplates = {
  order_created: {
    subject: 'Order Confirmation - Order #{{orderId}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
          .order-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
          </div>
          <div class="content">
            <h2>Thank you for your order, {{userName}}!</h2>
            <p>Your order has been successfully placed and is being processed.</p>

            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> #{{orderId}}</p>
              <p><strong>Order Total:</strong> ${{totalAmount}}</p>
              <p><strong>Order Date:</strong> {{orderDate}}</p>
            </div>

            <p>We'll send you another notification when your order ships.</p>
            <p style="text-align: center; margin-top: 20px;">
              <a href="{{orderUrl}}" class="button">View Order Details</a>
            </p>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  order_paid: {
    subject: 'Payment Received - Order #{{orderId}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .payment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmed</h1>
          </div>
          <div class="content">
            <h2>Hi {{userName}},</h2>
            <p>We have successfully received your payment.</p>

            <div class="payment-details">
              <h3>Payment Details</h3>
              <p><strong>Order Number:</strong> #{{orderId}}</p>
              <p><strong>Amount Paid:</strong> ${{totalAmount}}</p>
              <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
              <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            </div>

            <p>Your order is now being processed and will be shipped soon.</p>
          </div>
          <div class="footer">
            <p>Thank you for your payment!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  order_shipped: {
    subject: 'Your Order Has Shipped - Order #{{orderId}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; }
          .shipping-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FF9800; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Order Is On Its Way!</h1>
          </div>
          <div class="content">
            <h2>Great news, {{userName}}!</h2>
            <p>Your order has been shipped and is on its way to you.</p>

            <div class="shipping-details">
              <h3>Shipping Details</h3>
              <p><strong>Order Number:</strong> #{{orderId}}</p>
              <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
              <p><strong>Carrier:</strong> {{carrier}}</p>
              <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
            </div>

            <p style="text-align: center; margin-top: 20px;">
              <a href="{{trackingUrl}}" class="button">Track Your Package</a>
            </p>
          </div>
          <div class="footer">
            <p>We hope you enjoy your purchase!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  order_delivered: {
    subject: 'Order Delivered - Order #{{orderId}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Order Has Been Delivered!</h1>
          </div>
          <div class="content">
            <h2>Hi {{userName}},</h2>
            <p>Your order #{{orderId}} has been successfully delivered.</p>
            <p><strong>Delivered on:</strong> {{deliveryDate}}</p>

            <p>We hope you enjoy your purchase! If you have any questions or concerns, please don't hesitate to contact us.</p>

            <p style="text-align: center; margin-top: 20px;">
              <a href="{{reviewUrl}}" class="button">Write a Review</a>
              <a href="{{supportUrl}}" class="button">Contact Support</a>
            </p>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  order_cancelled: {
    subject: 'Order Cancelled - Order #{{orderId}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .refund-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Cancellation Confirmation</h1>
          </div>
          <div class="content">
            <h2>Hi {{userName}},</h2>
            <p>Your order #{{orderId}} has been cancelled as requested.</p>

            <div class="refund-details">
              <h3>Refund Information</h3>
              <p><strong>Order Number:</strong> #{{orderId}}</p>
              <p><strong>Refund Amount:</strong> ${{refundAmount}}</p>
              <p><strong>Reason:</strong> {{cancellationReason}}</p>
            </div>

            <p>The refund will be processed within 5-7 business days and will be credited to your original payment method.</p>

            <p>If you have any questions or concerns, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>We hope to serve you again soon!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

export const smsTemplates = {
  order_created: 'Your order #{{orderId}} has been confirmed. Total: ${{totalAmount}}. Track at: {{orderUrl}}',
  order_paid: 'Payment of ${{totalAmount}} received for order #{{orderId}}. Thank you!',
  order_shipped: 'Your order #{{orderId}} has shipped! Track with {{carrier}}: {{trackingNumber}}',
  order_delivered: 'Your order #{{orderId}} has been delivered. Enjoy your purchase!',
  order_cancelled: 'Order #{{orderId}} cancelled. Refund of ${{refundAmount}} will be processed in 5-7 days.',
};
