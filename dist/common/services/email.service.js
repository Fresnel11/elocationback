"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let EmailService = class EmailService {
    constructor() {
        this.isConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
        if (!this.isConfigured) {
            console.warn('[EmailService] EMAIL_USER/EMAIL_PASSWORD absents : aucun email ne sera envoyé.');
        }
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
        });
    }
    async sendOtpEmail(email, code, firstName) {
        const mailOptions = {
            from: `"eLocation Bénin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Code de vérification eLocation - ${new Date().toLocaleString('fr-FR')}`,
            html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Code de vérification eLocation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">🏠 eLocation</h1>
                      <p style="color: #e8f0fe; margin: 8px 0 0 0; font-size: 16px;">Votre plateforme de confiance</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Bienvenue ${firstName} ! 👋</h2>
                      
                      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Merci de vous être inscrit sur eLocation. Pour finaliser votre inscription, veuillez utiliser le code de vérification ci-dessous :
                      </p>
                      
                      <!-- OTP Code Box -->
                      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px dashed #cbd5e0; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                        <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Code de vérification</p>
                        <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                          <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${code}</span>
                        </div>
                        <p style="color: #e53e3e; font-size: 14px; margin: 15px 0 0 0; font-weight: 500;">⏰ Expire dans 10 minutes</p>
                      </div>
                      
                      <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
                        <p style="color: #2d3748; font-size: 14px; margin: 0; line-height: 1.5;">
                          <strong>💡 Conseil de sécurité :</strong> Ne partagez jamais ce code avec qui que ce soit. Notre équipe ne vous demandera jamais votre code de vérification.
                        </p>
                      </div>
                      
                      <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                        Si vous n'avez pas créé de compte sur eLocation, vous pouvez ignorer cet email en toute sécurité.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">Merci de faire confiance à eLocation</p>
                      <p style="color: #a0aec0; font-size: 12px; margin: 0;">© 2025 eLocation Bénin. Tous droits réservés.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
        };
        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`OTP email sent to ${email}`);
        }
        catch (error) {
            console.error('Email send failed:', error.message);
            throw new Error('Failed to send verification email');
        }
    }
    async sendPasswordResetEmail(email, code, firstName) {
        const mailOptions = {
            from: `"eLocation Bénin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Réinitialisation de mot de passe - eLocation [${Date.now()}]`,
            html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Réinitialisation de mot de passe</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">🔒 eLocation</h1>
                      <p style="color: #fed7d7; margin: 8px 0 0 0; font-size: 16px;">Réinitialisation sécurisée</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Bonjour ${firstName} 👋</h2>
                      
                      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Vous avez demandé la réinitialisation de votre mot de passe. Utilisez le code ci-dessous pour créer un nouveau mot de passe :
                      </p>
                      
                      <!-- Reset Code Box -->
                      <div style="background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%); border: 2px dashed #fc8181; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                        <p style="color: #742a2a; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Code de réinitialisation</p>
                        <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                          <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #e53e3e; letter-spacing: 8px;">${code}</span>
                        </div>
                        <p style="color: #c53030; font-size: 14px; margin: 15px 0 0 0; font-weight: 500;">⏰ Expire dans 10 minutes</p>
                      </div>
                      
                      <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
                        <p style="color: #2d3748; font-size: 14px; margin: 0; line-height: 1.5;">
                          <strong>🚨 Important :</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.
                        </p>
                      </div>
                      
                      <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                        Pour votre sécurité, ce code ne peut être utilisé qu'une seule fois et expire automatiquement.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">Équipe sécurité eLocation</p>
                      <p style="color: #a0aec0; font-size: 12px; margin: 0;">© 2025 eLocation Bénin. Tous droits réservés.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
        };
        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Password reset email sent to ${email}`);
        }
        catch (error) {
            console.error('Password reset email send failed:', error.message);
            throw new Error('Failed to send password reset email');
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map