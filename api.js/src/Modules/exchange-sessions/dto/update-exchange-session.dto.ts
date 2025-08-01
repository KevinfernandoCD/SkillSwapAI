import { IsString, IsBoolean, IsOptional, IsNumber, IsDateString, IsEnum, Min, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExchangeSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTeaching?: boolean;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ enum: ['upcoming', 'completed', 'cancelled'] })
  @IsOptional()
  @IsEnum(['upcoming', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsString({ each: true })
  subTopics?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingLink?: string;

  // New fields for exchange sessions
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  skillId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  requestedSkillId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  requestedBy?: string;
} 