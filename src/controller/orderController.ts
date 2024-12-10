import { paymentDispatcher } from "@/dispatcher";
import { IOrderModel, orderContent, OrderStatus, PaymentProvider, PaymentWay } from "@/model/order";
import { IProductModel, ProductModel } from "@/model/product";
import { genUId, transitionHandler } from "@/utils/loggers";
import { error } from "console";
import { NextFunction, Request, Response } from "express"
import { body, ValidationChain, validationResult } from "express-validator";
import { Knex } from "knex";
import { isEmpty, pick } from "lodash";

interface createOrderResquestParams{
    paymentProvider:PaymentProvider,
    paymentWay:PaymentWay,
    contents:orderContent[];
}

export interface IOrderController {
    creatOrderValidator(): ValidationChain[]; 
    createOrder(req:Request<any,any,createOrderResquestParams,any>,res:Response,next:NextFunction):void;
    updateOrder(req:Request<any,any,any,any>,res:Response,next:NextFunction):void;
}

export class OrderController implements IOrderController {
    
    knexSql: Knex;
    orderModel:IOrderModel;
    productModel:IProductModel;

    public static createController({knexSql, orderModel, productModel}:{
        knexSql: Knex,
        orderModel: IOrderModel,
        productModel: IProductModel
    }) {
        return new OrderController({knexSql, orderModel, productModel});
    }

    constructor({knexSql, orderModel, productModel}:{
        knexSql: Knex,
        orderModel: IOrderModel,
        productModel: IProductModel
    }) { 
        this.knexSql = knexSql;
        this.orderModel = orderModel;
        this.productModel = productModel;
    }
    
    public creatOrderValidator = () => {
        const paymentProviderValidater = (value:any) => {
            return [PaymentProvider.ECPAY,PaymentProvider.PAYPAL].includes(value);
        };
        const paymentWayValidator = (value:any) => {
            return [PaymentWay.CVS, PaymentWay.PAYPAL].includes(value);
        };

        const contentValidator = (value:orderContent[]) => {
            if (isEmpty(value)) return false;

            for (const product of value){
                if ([product.productId, product.price, product.amount].some((val) =>  !val) )
                    return false;
            }

            return true; 
        };

        return [
            //設定驗證參數是否合法
            body("paymentProvider","Invalid payment provider").custom(paymentProviderValidater),
            body("paymentWay","Invalid payment way").custom(paymentWayValidator),
            body("contents","Invalid product contents").isArray().custom(contentValidator),
            
        ];
    };

    public createOrder: IOrderController["createOrder"] = async (req,res,_next) =>{
        let { paymentProvider,paymentWay,contents } = req.body;
        console.log("file orderController.ts line34 paymentProvider,paymentWay,contents",paymentProvider,paymentWay,contents);

        //validationResult有問題
        //1.資料驗證 routes order.ts middleware express-validator 
        const errors = validationResult(req);
        console.log("errors--->",errors);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()}); 
        } 
        
        //2.將資料寫入DataBase-->order.id
        try{
            await transitionHandler(this.knexSql, async(trx:Knex.Transaction)=>{
                const results = await Promise.all(
                    contents.map(
                        async(product) => 
                            await this.productModel.preSell(
                            {
                                id: product.productId,
                                ...pick(product,["price","amount"])
                            },
                            trx
                        )
                    )
                );
                if(results.some((result) => !result))
                    throw new Error("Cannot buybecause out of stuff");

                const totalPrice = contents.reduce(
                    ( acc,product ) => acc + product.price * product.amount,
                    0
                );
                console.log("totalPrice------>",totalPrice);
                const uid = genUId()
                await this.orderModel.create({
                    id: uid,
                    total:totalPrice,
                    createdAt:new Date(),
                    updatedAt:new Date(),
                    paymentProvider,
                    paymentWay,
                    status:OrderStatus.WAITING,
                    contents,
                    },
                    trx
                );

                const products = await this.productModel.findByIds(contents.map((product)=>product.productId));
                const contentInfos = contents.map((content)=>{
                    const product = products?.find((p) => p.id === content.productId);
					return {
						name: product?.name || '',
						price: content.price,
						amount: content.amount,
						desc: product?.description || '',
					};
                });

                //3.金流API串接(ECPay,PayPal)
                const result = await paymentDispatcher({
                    paymentProvider,
                    paymentWay,
                    payload:{
                        billId: uid,
                        totalPrice,
                        desc:`create order bill from ${uid} with ${contents.map((content)=>content.productId).join(",")}`,
                        returnURL:`${process.env.END_POINT}/orders/update`,
                        details:contentInfos || [],
                    }
                })

                res.json({status:"success",data:result});
                
            });
        }catch (err:any){
            res.status(500).json({ errors:err.message });
            throw err;
        }
        

        

        //4.return DataBase Created Success
        
        
    }
    
    public updateOrder: IOrderController["updateOrder"] = async (req,res,_next) =>{
        //console.log("file:orderController.ts line 164 ordercontroller req",req.body);
        let merchantTradeNo = '';
		let tradeDate = '';

		if ('RtnCode' in req.body && 'MerchantTradeNo' in req.body) {
			// ECPay
			const { MerchantTradeNo, RtnCode, TradeDate } = req.body;
			if (RtnCode !== '1') return res.status(500).send('0|Failed');
			merchantTradeNo = MerchantTradeNo;
			tradeDate = TradeDate;
		} else if ('resource' in req.body) {
			// Paypal
			const { custom_id, status, update_time } = req.body.resource;
			if (status !== 'COMPLETED') return res.status(500).send(500);
			merchantTradeNo = custom_id;
			tradeDate = update_time;
		}
		try {
			// 從 order 中找出我們的訂單
			const order = await this.orderModel.findOne(merchantTradeNo);
			if (isEmpty(order)) res.status(500).send('0|Failed');
			if (order?.status !== OrderStatus.WAITING) res.status(500).send('0|Failed');

			// 更新 product 減少的商品
			const results = await Promise.all(
				order!.contents.map(
					async (product) =>
						await this.productModel.updateAmount({
							id: product.productId,
							...pick(product, ['price', 'amount']),
						})
				)
			);

			if (results.some((result) => !result)) return res.status(500).send('0|Failed');

			// 更新 order 狀態
			await this.orderModel.update(merchantTradeNo, {
				status: OrderStatus.SUCCESS,
				updatedAt: new Date(tradeDate),
			});

			res.status(200).send('1|OK');
		} catch (err: any) {
			console.error(err);
			res.status(500).send('0|Failed');
		}
        /*
        let merchantTradeNo = "";
        let tradeDate = "";

        if ("RtnCode" in req.body && "MerchantTradeNo" in req.body ) {
            const {MerchantTradeNo,RtnCode,TradeDate} = req.body

            if (RtnCode !== "1") {
                return res.status(500).send("0|Failed");
            }
            merchantTradeNo = MerchantTradeNo;
            tradeDate = TradeDate;
        }else if( "resource" in req.body){
            //paypal
            const {custom_id,status,update_time} = req.body.resource;

            if (status !== "COMPLETED") return res.status(500).send(500);

            merchantTradeNo = custom_id;
            tradeDate = update_time;
        }

        try{
            //從order找出訂單 
            const order = await this.orderModel.findOne(merchantTradeNo);
            if (isEmpty(order)) res.status(500).send("0|Failed");
            if (order?.status !== OrderStatus.WAITING) res.status(500).send("0|Failed");
            //更新product減少的商品
            const results = await Promise.all(
                order!.contents.map(
                    async(product)=>
                        await this.productModel.updateAmount({
                            id:product.productId,
                            ...pick(product,["price", "amount"]),
                        }
                    )
                )
            );
            if(results.some(result => !result)) return res.status(500).send("0|Failed");
            //更新order狀態
            await this.orderModel.update(merchantTradeNo,{
                status:OrderStatus.SUCCESS,
                updatedAt:new Date(tradeDate),
            })      
            //return      
            res.status(200).send("1|OK");
             
        }catch(err:any){
            console.log(err);
            res.status(500).send("0|Failed");
        }
        
        res.status(200).send("1|OK");
        */
    }; 
}
