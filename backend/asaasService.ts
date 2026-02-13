
import axios from 'axios';

const ASAAS_API_URL = import.meta.env.VITE_ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = import.meta.env.VITE_ASAAS_API_KEY;

export const AsaasService = {
    /**
     * Creates or retrieves a customer in Asaas by email
     */
    async getOrCreateCustomer(name: string, email: string, document: string) {
        try {
            // 1. Search existing
            const searchRes = await axios.get(`${ASAAS_API_URL}/customers?email=${email}`, {
                headers: { access_token: ASAAS_API_KEY }
            });

            if (searchRes.data.data && searchRes.data.data.length > 0) {
                return searchRes.data.data[0].id;
            }

            // 2. Create new
            const createRes = await axios.post(`${ASAAS_API_URL}/customers`, {
                name,
                email,
                cpfCnpj: document.replace(/\D/g, '')
            }, {
                headers: { access_token: ASAAS_API_KEY }
            });

            return createRes.data.id;
        } catch (error: any) {
            console.error("Asaas Customer Error:", error.response?.data || error.message);
            throw new Error("Erro ao processar cliente no Asaas.");
        }
    },

    /**
     * Generates a payment link (Charging) for a specific plan and cycle
     */
    async createPayment(customerId: string, value: number, description: string) {
        try {
            const res = await axios.post(`${ASAAS_API_URL}/payments`, {
                customer: customerId,
                billingType: 'UNDEFINED', // Allows customer to choose PIX, Card or Billet
                value: value,
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days
                description: description,
                externalReference: customerId // Use this for webhook callback
            }, {
                headers: { access_token: ASAAS_API_KEY }
            });

            return {
                id: res.data.id,
                invoiceUrl: res.data.invoiceUrl,
                bankSlipUrl: res.data.bankSlipUrl
            };
        } catch (error: any) {
            console.error("Asaas Payment Error:", error.response?.data || error.message);
            throw new Error("Erro ao gerar link de pagamento no Asaas.");
        }
    }
};
