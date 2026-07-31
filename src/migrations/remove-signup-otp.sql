-- Suppression de la vérification OTP à l'inscription.
--
-- 1. Les comptes créés avant ce changement sont restés `isActive = 0` en attente
--    d'un code OTP : sans les endpoints /auth/request-otp et /auth/verify-otp,
--    ils ne pourraient plus jamais se connecter. On les active.
UPDATE users SET isActive = 1 WHERE isActive = 0;

-- 2. Les colonnes du code d'inscription ne sont plus utilisées.
--    (Les colonnes resetPasswordOtp / resetPasswordOtpExpiresAt sont conservées :
--     le mot de passe oublié utilise toujours un code par email.)
ALTER TABLE users DROP COLUMN otpCode;
ALTER TABLE users DROP COLUMN otpExpiresAt;
