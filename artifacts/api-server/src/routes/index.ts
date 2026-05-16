import { Router, type IRouter } from "express";
import healthRouter from "./health";
import invitationsRouter from "./invitations";
import inviteRouter from "./invite";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(invitationsRouter);
router.use(inviteRouter);
router.use(notificationsRouter);

export default router;
