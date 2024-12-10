import { isJason } from "@/utils/loggers";
import knex, { Knex } from "knex"; 
import { camelCase, isEmpty, mapKeys, mapValues, snakeCase } from "lodash";


export interface IBase<T> {
    findAll( trx?:Knex.Transaction ): Promise<T[] | null>;
    findOne(id : any, trx?:Knex.Transaction ): Promise<T | null>;
    create(data: Omit<T,"id">,trx?:Knex.Transaction ): Promise<T | null>;
    update(
        id: any, 
        data: Partial< Omit<T,"id">>,
        trx?:Knex.Transaction
    ): Promise<T | null>;
    delete(id: any,trx?:Knex.Transaction ): Promise<void>;
}
 
export abstract class Base<T> implements IBase<T> {
    protected knexSql: Knex;
    protected tableName: string = "";
    protected schema = {};
    constructor({ knexSql, tableName} : {knexSql: Knex, tableName?: string}) {
        this.knexSql = knexSql;

        if(tableName) this.tableName = tableName;
    };
    public findAll = async( trx?:Knex.Transaction ) => {
 
        let sqlBulider = this.knexSql(this.tableName).select(this.schema);

        if (trx) sqlBulider = sqlBulider.transacting(trx);

        const result = await sqlBulider;

        if (isEmpty(result)) return null;

        return result.map(this.DBData2DataObject) as T[]; 
    };
    public findOne = async(id : any, trx?:Knex.Transaction ) =>{
        let sqlBulider = this.knexSql(this.tableName).select(this.schema).where({id});
        //console.log("this.tableName ------>",this.tableName,"this.schema------->",this.schema)
        if (trx) sqlBulider = sqlBulider.transacting(trx);

        const result = await sqlBulider;

        if (isEmpty(result)) return null;

        return this.DBData2DataObject(result[0]) as T; 
    };
    public create = async(data: Omit<T,"id">,trx?:Knex.Transaction ) =>{
        //console.log('base.ts create funtion line42 data: ', data);
        //console.log('base.ts create funtion line43 DataObect2DBData: ',this.DataObect2DBData(data));
        let sqlBulider = this.knexSql(this.tableName).insert(this.DataObect2DBData(data));
        //console.log("this.tableName ------>",this.tableName,"this.DataObect2DBData(data)------->",this.DataObect2DBData(data))
        if (trx) sqlBulider = sqlBulider.transacting(trx);

        const result = await sqlBulider;
        console.log('base.ts create funtion line46 result: ', result);
        
        if (isEmpty(result)) return null;
        
        const id = result[0];
        console.log("id----------->",id);

        return await this.findOne(id,trx);
    };
    public update = async(
        id: any, 
        data: Partial< Omit<T,"id">>,
        trx?:Knex.Transaction
    ) =>{
        let sqlBulider = this.knexSql(this.tableName).update(this.DataObect2DBData(data)).where({id});

        if (trx) sqlBulider = sqlBulider.transacting(trx);

        await sqlBulider;

        return await this.findOne(id,trx);
    };
    public delete = async(id: any,trx?:Knex.Transaction ) => {
        let sqlBulider = this.knexSql(this.tableName).where({id}).del();

        if (trx) sqlBulider = sqlBulider.transacting(trx);

        await sqlBulider;

        return; 
    };
    protected DBData2DataObject = (data:any)=>{
        const trasform = mapValues(data,(value,key)=>{
            if(['updatedAt','createdAt'].includes(key)) return new Date(value);

            if(isJason(value)) return JSON.parse(value);

            return value;
        })

        return mapKeys(trasform,(value,key)=>camelCase(key));
    };
    protected DataObect2DBData = (data:any)=>{
        const trasform = mapValues(data,(value,key)=>{
            if(['updatedAt','createdAt'].includes(key)) return new Date(value);

            if( typeof value === 'object') return JSON.stringify(value);

            return value;
        })

        return mapKeys(trasform,(value,key)=>snakeCase(key));
    };
} 

