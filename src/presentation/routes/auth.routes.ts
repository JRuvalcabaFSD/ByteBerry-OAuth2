import { Router } from 'express';
import { LoginController } from '../controller/login.controller.js';

//TODO documentar
export function createAuthRoutes(loginCtl: LoginController): Router {
	const router = Router();
	router.get('/login', loginCtl.getLoginForm);
	return router;
}
