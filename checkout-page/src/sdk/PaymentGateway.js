/**
 * PaymentGateway SDK - Embeddable payment widget
 * 
 * Usage:
 * const checkout = new PaymentGateway({
 *   key: 'key_test_abc123',
 *   orderId: 'order_xyz',
 *   onSuccess: (response) => { console.log('Success:', response); },
 *   onFailure: (error) => { console.log('Failed:', error); },
 *   onClose: () => { console.log('Modal closed'); }
 * });
 * checkout.open();
 */

class PaymentGateway {
  constructor(options) {
    // Validate required options
    if (!options || typeof options !== 'object') {
      throw new Error('PaymentGateway options are required');
    }

    if (!options.key) {
      throw new Error('API key is required');
    }

    if (!options.orderId) {
      throw new Error('Order ID is required');
    }

    // Store configuration
    this.key = options.key;
    this.orderId = options.orderId;
    this.onSuccess = options.onSuccess || (() => {});
    this.onFailure = options.onFailure || (() => {});
    this.onClose = options.onClose || (() => {});

    // Store modal reference
    this.modal = null;
    this.iframe = null;

    // Bind message listener
    this.messageListener = this.handleMessage.bind(this);
  }

  /**
   * Open the payment modal
   */
  open() {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'payment-gateway-modal';
    modal.setAttribute('data-test-id', 'payment-modal');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 480px;
      height: 600px;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      position: relative;
    `;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.setAttribute('data-test-id', 'close-modal-button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 32px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    `;
    closeButton.onclick = () => this.close();

    // Create iframe
    const baseUrl = window.location.protocol + '//' + window.location.host;
    const iframeUrl = `${baseUrl}/checkout?order_id=${encodeURIComponent(this.orderId)}&embedded=true&key=${encodeURIComponent(this.key)}`;
    
    const iframe = document.createElement('iframe');
    iframe.setAttribute('data-test-id', 'payment-iframe');
    iframe.src = iframeUrl;
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
    `;

    // Store references
    this.modal = modal;
    this.iframe = iframe;

    // Assemble DOM
    modalContent.appendChild(iframe);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);

    // Append to body
    document.body.appendChild(modal);

    // Set up message listener
    window.addEventListener('message', this.messageListener);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Handle messages from iframe
   */
  handleMessage(event) {
    // In production, validate event.origin
    // For this project, '*' is acceptable
    
    const { type, data } = event.data;

    switch (type) {
      case 'payment_success':
        this.onSuccess(data);
        this.close();
        break;

      case 'payment_failed':
        this.onFailure(data);
        break;

      case 'close_modal':
        this.close();
        break;

      default:
        // Ignore unknown message types
        break;
    }
  }

  /**
   * Close the payment modal
   */
  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
      this.iframe = null;
    }

    // Remove message listener
    window.removeEventListener('message', this.messageListener);

    // Restore body scroll
    document.body.style.overflow = '';

    // Call close callback
    this.onClose();
  }
}

// Expose globally for merchant integration
window.PaymentGateway = PaymentGateway;

export default PaymentGateway;
