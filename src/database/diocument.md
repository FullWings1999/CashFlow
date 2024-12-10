
  clients   |->| Nodejs Sever |->| database
(frontend)  |->|  (backend)   |->|

### Database 規劃### 
產品表
- id 流水號 唯一代替產品名稱的辦識號碼 auto_increment
- name varchar (255) not null
- amount integer unsigned == 100
- description text 描述產品
- pre_order 作為金流交易賣出物品時的預扣額度（）

新增欄位
ALTER TABLE `products` ADD `price` int UNSIGNED NOT NULL default 0; 

### 訂單表 ###
- id varchar(20) not null primary key COMMENT, “大部分金流的API他們的 ID 都要求你是一個亂數的字串"
- total int unsigned not null default 0,
- created_at datetime not null default now(),
- updated_at datetime not null default now(),
- payment_provider enum("PAYPAL", "ECPAY"),
- payment_way enum ("CVS", "ATM", "PAYPAL"),
- status enum ("WAITING", "SUCCESS", "FAILED", "CANCEL")
- contents JSON default nuLL COMMENT "商品內容[{商品ID，商品數量，商品價格}]"

//insert into orders(id,total,payment_provider,payment_way,status) values(1,2,"PAYPAL","CVS","SUCCESS");