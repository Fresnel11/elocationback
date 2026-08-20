import { Controller, Post, Body, Req, Res, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MonerooService } from './moneroo.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PayoutDto } from './dto/payout.dto';
import { BookingsService } from '../bookings/bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('moneroo')
export class MonerooController {
  constructor(
    private readonly monerooService: MonerooService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Post('create-payment')
  @UseGuards(JwtAuthGuard)
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    const { amount, currency, metadata } = createPaymentDto;
    const paymentData = {
      amount,
      currency,
      description: metadata?.description || 'Payment',
      customer: metadata?.customer || {
        email: 'customer@example.com',
        firstName: 'Customer',
        lastName: 'Name'
      },
      returnUrl: metadata?.returnUrl || `${process.env.FRONTEND_URL}/payment/return`,
      metadata
    };
    return await this.monerooService.initializePayment(paymentData);
  }

  @Post('webhook')
  async webhook(@Req() req, @Res() res) {
    const event = req.body;
    console.log('Webhook Moneroo reçu :', event);

    try {
      // Ce endpoint est forcément public (Moneroo l'appelle sans notre JWT), et il
      // n'existe aucune vérification de signature dans ce projet — le corps de la
      // requête n'est donc pas fiable en soi : n'importe qui connaissant un
      // bookingId pouvait forger { status: 'success', metadata: { bookingId } } et
      // confirmer une réservation sans paiement réel. On revérifie le paiement
      // directement auprès de Moneroo avant de confirmer quoi que ce soit, comme le
      // fait déjà correctement /moneroo/payment/return.
      if (event.payment_id && event.metadata?.bookingId) {
        const verification = await this.monerooService.verifyPayment(event.payment_id);
        if (verification.status === 'success') {
          await this.bookingsService.confirmPayment(event.metadata.bookingId, {
            payment_id: event.payment_id,
            amount: verification.amount,
            currency: verification.currency,
          });

          console.log(`Paiement confirmé pour la réservation ${event.metadata.bookingId}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement du webhook Moneroo:', error);
      // On retourne quand même 200 pour éviter les retry de Moneroo
    }

    return res.status(200).send('OK');
  }

  @Post('release-funds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async releaseFunds(@Body() payoutDto: PayoutDto) {
    const { amount, recipient } = payoutDto;
    return await this.monerooService.initializePayout(amount, recipient);
  }

  @Get('verify/:paymentId')
  async verifyPayment(@Param('paymentId') paymentId: string) {
    return await this.monerooService.verifyPayment(paymentId);
  }

  @Get('payment/return')
  async paymentReturn(@Query() query: any, @Res() res) {
    const { paymentId, paymentStatus, bookingId } = query;
    
    try {
      if (paymentStatus === 'success' && paymentId) {
        // Vérifier le paiement côté serveur
        const verification = await this.monerooService.verifyPayment(paymentId);
        
        if (verification.status === 'success' && bookingId) {
          // Confirmer le paiement de la réservation
          await this.bookingsService.confirmPayment(bookingId, {
            payment_id: paymentId,
            amount: verification.amount,
            currency: verification.currency,
          });
          
          // Rediriger vers la page de succès
          return res.redirect(`${process.env.FRONTEND_URL}/booking/${bookingId}?payment=success`);
        }
      }
      
      // Rediriger vers la page d'échec
      return res.redirect(`${process.env.FRONTEND_URL}/booking/${bookingId}?payment=failed`);
    } catch (error) {
      console.error('Erreur lors du retour de paiement:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/booking/${bookingId}?payment=error`);
    }
  }
}