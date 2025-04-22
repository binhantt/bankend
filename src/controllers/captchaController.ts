import { Request, Response } from 'express';
import CaptchaService from '../services/captchaService';

class CaptchaController {
    public generate = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id, svg } = CaptchaService.generate();
            
            res.json({
                success: true,
                data: {
                    captchaId: id,
                    captchaSvg: svg
                }
            });
        } catch (error) {
            console.error('Captcha generation error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tạo mã xác thực'
            });
        }

    };
}

export default new CaptchaController();