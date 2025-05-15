import { v4 as uuidv4 } from 'uuid';
import svgCaptcha from 'svg-captcha';

class CaptchaService {
    private static captchas: Map<string, { text: string; expires: number }> = new Map();
    private static readonly EXPIRY_TIME = 5 * 60 * 1000; 

    static generate(): { id: string; svg: string } {
        const captcha = svgCaptcha.create({
            size: 6,
            noise: 2,
            color: true,
            background: '#f4f4f4',
            width: 150,
            height: 50,
            fontSize: 50
        });

        const id = uuidv4();
        
        this.captchas.set(id, {
            text: captcha.text,
            expires: Date.now() + this.EXPIRY_TIME
        });

        console.log('Generated CAPTCHA:', {
            id,
            text: captcha.text,
            expires: new Date(Date.now() + this.EXPIRY_TIME).toISOString()
        });
        const base64Svg = Buffer.from(captcha.data, 'utf-8').toString('base64');
        return { 
            id,
            svg: `data:image/svg+xml;base64,${base64Svg}`   
        };
    }

    static verify(id: string, text: string): boolean {
        const captcha = this.captchas.get(id);
        
        console.log('Verifying CAPTCHA:', {
            id,
            inputText: text,
            storedText: captcha?.text,
            exists: !!captcha,
            expires: captcha ? new Date(captcha.expires).toISOString() : null
        });
        
        if (!captcha) {
            console.log('CAPTCHA not found');
            return false;
        }

        if (Date.now() > captcha.expires) {
            console.log('CAPTCHA expired');
            this.captchas.delete(id);
            return false;
        }

        const isValid = captcha.text.toLowerCase() === text.toLowerCase();
        console.log('CAPTCHA validation result:', isValid);
        this.captchas.delete(id);
        
        return isValid;
    }

    static cleanup(): void {
        const now = Date.now();
        for (const [id, captcha] of this.captchas.entries()) {
            if (now > captcha.expires) {
                this.captchas.delete(id);
            }
        }
    }
}

// Run cleanup every minute
setInterval(() => CaptchaService.cleanup(), 60 * 1000);

export default CaptchaService;