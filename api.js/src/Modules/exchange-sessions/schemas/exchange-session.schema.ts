import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ExchangeSessionDocument = ExchangeSession & Document;

@Schema({ timestamps: true })
export class ExchangeSession {
  @ApiProperty()
  @Prop({ required: true })
  title: string;

  @ApiProperty({ required: false })
  @Prop()
  description?: string;

  @ApiProperty()
  @Prop({ required: true })
  date: string;

  @ApiProperty()
  @Prop({ required: true })
  startTime: string;

  @ApiProperty()
  @Prop({ required: true })
  endTime: string;

  @ApiProperty()
  @Prop({ required: true })
  skillCategory: string;

  @ApiProperty({ enum: ['upcoming', 'completed', 'cancelled'] })
  @Prop({ enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming' })
  status: string;

  @ApiProperty({ required: false })
  @Prop()
  maxParticipants?: number;

  @ApiProperty({ required: false, default: false })
  @Prop({ default: false })
  isPublic?: boolean;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  hostId: Types.ObjectId;

  @ApiProperty({ type: [String], required: false })
  @Prop({ type: [String], default: [] })
  subTopics?: string[];

  @ApiProperty({ required: false })
  @Prop()
  meetingLink?: string;

  // New fields for exchange sessions
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Skill', required: true })
  skillId: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Skill', required: true })
  requestedSkillId: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export const ExchangeSessionSchema = SchemaFactory.createForClass(ExchangeSession); 