import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate, registerSchema, loginSchema, refreshTokenSchema } from '../middleware/validation';

const router = Router();
const authController = new AuthController();

router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/login', validate(loginSchema), authController.login.bind(authController));
router.post('/refresh', validate(refreshTokenSchema), authController.refresh.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.get('/verify', authController.verifyToken.bind(authController));

export default router;
