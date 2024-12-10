import path from 'path';
import log4js from 'log4js';
import { configure } from 'log4js';
export { getLogger } from 'log4js';

import knex, { Knex } from 'knex';
import e from 'express';
import { error } from 'console';
import { v4 as uuidv4 } from 'uuid';

enum ISOLATION_LEVEL{
  READ_UNCOMMITTED = "READ_UNCOMMITTED",
  READ_COMMITTED = "READ_COMMITTED",
  REPEATABLE_READ = "REPEATABLE_READ",
  SERIALIZABLE = "SERIALIZABLE" ,
}

export const creatDatabase = () =>{
  return knex({
    client: 'mysql',
    connection: {
      host: process.env.DATABASE_HOST || '127.0.0.1',
      port: Number(process.env.DATABASE_PORT) || 3307,
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || 'xuemi_example',
      database: process.env.DATABASE_DATABASE || 'xuemi',
    },
    pool: { min: 2, max: 5 },
  });
}

export function bootstrapLogger() {
  const date = new Date();
  const strDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

  configure({
    appenders: {
      out: { type: 'stdout' },
      app: { type: 'file', filename: path.join(__dirname, '..', 'logs', `${strDate}.log`) }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  });

  const logger = log4js.getLogger();
  logger.level = 'debug';
}

export const isJason = (value:string) =>{
  try {
    return Boolean(JSON.parse(value));
  } catch (error) {
    return false;
  }
}

export const transitionHandler = async <T=any>(
  knex: Knex,
  callback:(trx:Knex.Transaction) => Promise<T>,
  options:{
    retryTimes?: number;
    maxBackOff?: number;
    isolation?: ISOLATION_LEVEL;
  } = {}
) => {
  const { retryTimes = 100,maxBackOff = 1000,isolation } = options;
  let attempts = 0;
  const execTransaction = async ():Promise<T> => {
    const trx = await knex.transaction();

    try {
      if(isolation)
        await trx.raw('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
 
      const result = await callback(trx);
      await trx.commit();
      return result;

    }catch(err:any){
      await trx.rollback();
      if( err.code !== "1205") throw err;
      if( attempts > retryTimes ) throw Error("Transaction retry times i up to max");
      attempts++;
      await sleep(maxBackOff);
      return execTransaction();   
    }
  }
  return await execTransaction();
}

function sleep(maxBackOff: number) {
  return new Promise((resolve) => setTimeout(() => resolve(1), maxBackOff));
}

export const genUId = () =>{
  // timestamp 13+7 = 20
  const alpha = "abcdefghij";

  const timestampStr = new Date().getTime().toString();

  const code = timestampStr.split("")
  .map((v,idx) => idx%2 ? v : alpha[Number(v)])
  .join("")

  //用uuid產生剩下7位數
  const id = uuidv4().split("-")[0];
  return `${code}${id.substring(0, id.length -1 )}`;

}

