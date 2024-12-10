import exp from "constants";
import { Base, IBase } from "./base";
import knex, { Knex } from "knex";

export enum PaymentProvider{
    PAYPAL = "PAYPAL",
    ECPAY = "ECPAY"
}

export enum PaymentWay{
    CVS = "CVS",
    PAYPAL = "PAYPAL"
}

export enum OrderStatus{
    WAITING = "WAITING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    CANCEL = "CANCEL"
}

export interface orderContent{
    productId:number,
    amount:number
    price:number
}

export interface order{
    id: string;
    total:number; 
    createdAt:Date;
    updatedAt:Date;
    paymentProvider:PaymentProvider
    paymentWay:PaymentWay;
    status:OrderStatus;
    contents:orderContent[];
}

export interface IOrderModel extends IBase<order>{
    create(data:order, trx?:Knex.Transaction): Promise<order | null>;
}

export class OrderModel extends Base<order> implements IOrderModel  {
    tableName = "orders";
    schema = {
        id:"id",
        total:"total",
        createdAt:"created_at",
        updatedAt:"updated_at",
        paymentProvider:"payment_provider",
        paymentWay:"payment_way",
        status:"status",
        contents:"contents",
    };

    static createModel = ({ knexSql,tableName}: {knexSql:Knex;tableName?:string}) => {
        return new OrderModel({knexSql,tableName});  
    }
    
    constructor({ knexSql,tableName} : {knexSql:Knex; tableName?:string}){
        super({ knexSql, tableName});
    };
    
}