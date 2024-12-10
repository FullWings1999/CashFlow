import express from 'express';
import { ControllerContext } from '@/manager/controllerManager';

export const mountOrderRouter = ({controllerCtx}:{controllerCtx:ControllerContext}) => {
    let router = express.Router();

    router.post("/create",
        controllerCtx.orderController.creatOrderValidator(), //middleware 
        controllerCtx.orderController.createOrder
    );
    router.post("/update",
        controllerCtx.orderController.updateOrder
    );

    return router; 
}
