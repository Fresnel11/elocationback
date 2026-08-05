import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DemarcheurStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  /** Badge retiré après des signalements : la sanction rend la vérification crédible. */
  SUSPENDED = 'suspended',
}

/**
 * Candidature et statut d'un démarcheur.
 *
 * Volontairement séparé du rôle utilisateur : un utilisateur ne porte qu'un
 * seul rôle (relation ManyToOne, adossée au système de permissions), donc le
 * faire passer de « user » à « demarcheur » lui retirerait ses droits actuels.
 * Le statut de démarcheur est donc un attribut supplémentaire, pas un
 * remplacement d'identité.
 *
 * La vérification d'identité (UserVerification) reste le prérequis : on ne
 * redemande pas les pièces déjà fournies.
 */
@Entity('demarcheur_profiles')
export class DemarcheurProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

  /** Villes ou quartiers d'intervention, ex. ["Cotonou", "Abomey-Calavi"]. */
  @Column('json')
  zones!: string[];

  @Column({ type: 'int', default: 0 })
  experienceYears!: number;

  @Column({ type: 'text' })
  motivation!: string;

  /** Présentation publique, modifiable par le démarcheur une fois approuvé. */
  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({
    type: 'enum',
    enum: DemarcheurStatus,
    default: DemarcheurStatus.PENDING,
  })
  status!: DemarcheurStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ type: 'varchar', nullable: true })
  reviewedBy!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  /** Sert d'ancienneté publique (« démarcheur depuis mars 2026 »). */
  @Column({ type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
