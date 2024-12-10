import ECPay from "./ECPAY_Payment_node_js"
interface CVS_INFO{
    StoreExpireDate:string;
    Desc_1:string;
    Desc_2:string;
    Desc_3:string;
    Desc_4:string;
    PaymentInfoURL:string;
}

interface CVS_PARAMS{
    MerchantTradeNo:string;
    MerchantTradeDate:string;
    TotalAmount:string;
    TradeDesc:string;
    ItemName:string;
    ReturnURL:string;
}

interface CreateBillParams{
    cvsInfo?:CVS_INFO;
    cvsParams:CVS_PARAMS;
    inv_params?:{};
    client_redirect_url?: string;
}

interface IECpayAdapterOptions{
    OperationMode: 'Test' | 'Production'; //Test or Production
	MercProfile: {
		MerchantID: string;
		HashKey: string;
		HashIV: string;
	};
	IgnorePayment: [];
	IsProjectContractor: boolean;
}

const defaultOptions:IECpayAdapterOptions = {
    OperationMode: 'Test', //Test or Production
	MercProfile: {
		MerchantID: '3002599',
		HashKey: 'spPjZn66i0OhqJsQ',
		HashIV: 'hT5OJckN45isQTTs',
	},
	IgnorePayment: [
		//    "Credit",
		//    "WebATM",
		//    "ATM",
		//    "CVS",
		//    "BARCODE",
		//    "AndroidPay"
	],
	IsProjectContractor: false,
}

export interface IECpayAdapter{
    createCVS(createBillParams:CreateBillParams):string;
}

export class ECpayAdapter implements IECpayAdapter{
    private ecpayInstnce;

    constructor(options:IECpayAdapterOptions = defaultOptions){
        this.ecpayInstnce = new ECPay(options)
    }

    createCVS = ( createParams:CreateBillParams ) => {
        const {
            cvsInfo = {
                StoreExpireDate: '',
                Desc_1: '',
                Desc_2: '',
                Desc_3: '',
                Desc_4: '',
                PaymentInfoURL: '',
            },
            cvsParams,
            inv_params = {},
            client_redirect_url = '',
        } = createParams;

        const html = this.ecpayInstnce.payment_client.aio_check_out_cvs(cvsInfo, cvsParams, inv_params, client_redirect_url);
        return html;
    }
}