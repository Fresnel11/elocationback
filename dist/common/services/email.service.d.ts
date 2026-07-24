export declare class EmailService {
    private transporter;
    readonly isConfigured: boolean;
    constructor();
    sendOtpEmail(email: string, code: string, firstName: string): Promise<void>;
    sendPasswordResetEmail(email: string, code: string, firstName: string): Promise<void>;
}
