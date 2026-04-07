import { Router, type IRouter } from "express";
import healthRouter from "./health";
import invitationsRouter from "./invitations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(invitationsRouter);

export default router;
