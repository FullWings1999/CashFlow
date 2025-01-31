CREATE TABLE `orders`(
    `id` varchar(20) not null primary key COMMENT "大部分金流的API他們的 ID 都要求你是一個亂數的字串", 
    `total` int unsigned not null default 0,
    `created_at` datetime not null default now(),
    `updated_at` datetime not null default now(),
    `payment_provider` enum("PAYPAL", "ECPAY"),
    `payment_way` enum ("CVS","ATM", "PAYPAL"),
    `status` enum ("WAITING", "SUCCESS", "FAILED", "CANCEL"),
    `contents` JSON default nuLL COMMENT "商品內容[{商品ID,商品數量,商品價格}]"
);
