import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SessionsRepository } from './sessions.repository';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { Session } from './schemas/session.schema';
import { Skill, SkillDocument } from '../skills/schemas/skill.schema';
import { ExternalHttpService } from '../common/http.service';
import { PythonApiService } from '../common/python-api.service';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly sessionsRepository: SessionsRepository,
    @InjectModel(Skill.name) private readonly skillModel: Model<SkillDocument>,
    private readonly externalHttpService: ExternalHttpService,
    private readonly pythonApiService: PythonApiService,
  ) {}

  async create(userId: string, createSessionDto: CreateSessionDto): Promise<Session> {
    this.logger.log(`Creating new session for user: ${userId}`);
    this.logger.log(`Session data: ${JSON.stringify(createSessionDto)}`);

    // Create the session first
    const session = await this.sessionsRepository.create({ ...createSessionDto, hostId: userId });
    this.logger.log(`Session created successfully with ID: ${(session as any)._id}`);

    // Trigger background process if we have teachSkillId and focusKeywords
    if (createSessionDto.teachSkillId && createSessionDto.focusKeywords && createSessionDto.focusKeywords.length > 0) {
      this.logger.log(`Triggering background process for session: ${(session as any)._id}`);
      this.logger.log(`teachSkillId: ${createSessionDto.teachSkillId}`);
      this.logger.log(`focusKeywords: ${JSON.stringify(createSessionDto.focusKeywords)}`);

      // Execute background process asynchronously
      this.triggerBackgroundProcess((session as any)._id, createSessionDto.teachSkillId, createSessionDto.focusKeywords);
    } else {
      this.logger.log(`Skipping background process - missing teachSkillId or focusKeywords`);
      this.logger.log(`teachSkillId: ${createSessionDto.teachSkillId}`);
      this.logger.log(`focusKeywords: ${JSON.stringify(createSessionDto.focusKeywords)}`);
    }

    return session;
  }

  /**
   * Trigger the background process to send session data to Python API
   * This method executes asynchronously and does not block the main request
   */
  private triggerBackgroundProcess(sessionId: string, teachSkillId: string, focusKeywords: string[]): void {
    this.logger.log(`Starting background process execution`);
    
    // Execute in the next tick to ensure it doesn't block the current request
    process.nextTick(async () => {
      try {
        this.logger.log(`Fetching skill data for ID: ${teachSkillId}`);
        
        // Fetch skill data from database
        const skill = await this.skillModel.findById(teachSkillId).exec();
        
        if (!skill) {
          this.logger.error(`Skill not found for ID: ${teachSkillId}`);
          return;
        }

        this.logger.log(`Skill found: ${skill.name} (Category: ${skill.category})`);
        
        // Send data to Python API with session ID
        this.logger.log(`Executing background process to Python API`);
        this.externalHttpService.executeBackgroundProcess(sessionId, skill.name, focusKeywords);
        
        this.logger.log(`Background process initiated successfully`);
      } catch (error) {
        this.logger.error(`Error in background process: ${error.message}`);
        this.logger.error(`Stack trace: ${error.stack}`);
      }
    });
  }

  async findByUserId(userId: string, paginationDto: PaginationDto): Promise<PaginatedResult<Session>> {
    return this.sessionsRepository.findByUserId(userId, paginationDto);
  }

  async findUpcomingSessions(userId: string, paginationDto?: PaginationDto): Promise<PaginatedResult<Session>> {
    this.logger.log(`Finding upcoming sessions for user: ${userId}`);
    
    // Calculate date range for next 3 days
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    // Format dates as YYYY-MM-DD strings
    const todayStr = today.toISOString().split('T')[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];
    
    this.logger.log(`Date range: ${todayStr} to ${threeDaysStr}`);
    
    return this.sessionsRepository.findUpcomingSessions(userId, todayStr, threeDaysStr, paginationDto);
  }

  async findPublic(paginationDto: PaginationDto): Promise<PaginatedResult<Session>> {
    return this.sessionsRepository.findPublic(paginationDto);
  }

  async findById(id: string): Promise<Session> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async update(userId: string, id: string, updateSessionDto: UpdateSessionDto): Promise<Session | null> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.hostId._id.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only update your own sessions');
    }
    
    const updatedSession = await this.sessionsRepository.update(id, updateSessionDto);
    
    // Check if subTopics were updated and trigger background process if needed
    if (updateSessionDto.focusKeywords && updateSessionDto.focusKeywords.length > 0 && session.teachSkillId) {
      this.logger.log(`SubTopics updated for session: ${id}, triggering background process`);
      this.logger.log(`teachSkillId: ${session.teachSkillId}`);
      this.logger.log(`subTopics: ${JSON.stringify(updateSessionDto.focusKeywords)}`);

      // Execute background process asynchronously
      this.triggerBackgroundProcess(id, session.teachSkillId.toString(), updateSessionDto.focusKeywords);
    } else {
      this.logger.log(`No subTopics update detected or missing teachSkillId, skipping background process`);
      this.logger.log(`subTopics provided: ${updateSessionDto.focusKeywords ? 'yes' : 'no'}`);
      this.logger.log(`teachSkillId: ${session.teachSkillId}`);
    }
    
    return updatedSession;
  }

  async remove(userId: string, id: string): Promise<void> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.hostId._id.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only delete your own sessions');
    }
    
    await this.sessionsRepository.remove(id);
  }

  async search(query: string, status?: string, paginationDto?: PaginationDto): Promise<PaginatedResult<Session>> {
    return this.sessionsRepository.search(query, status, paginationDto);
  }

  /**
   * Find a session by a short 4-character code derived from the ObjectId
   */
  async findByCode(code: string): Promise<Session | null> {
    if (!code || code.length < 4) {
      throw new BadRequestException('Invalid session code');
    }
    return this.sessionsRepository.findByCode(code);
  }

  async joinSession(userId: string, sessionId: string): Promise<Session | null> {
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    
    if (session.hostId.toString() === userId) {
      throw new BadRequestException('You cannot join your own session');
    }
    
    if (session.participants.includes(userId as any)) {
      throw new BadRequestException('You are already a participant in this session');
    }
    
    if (session.maxParticipants && session.participants.length >= session.maxParticipants) {
      throw new BadRequestException('Session is full');
    }
    
    return this.sessionsRepository.addParticipant(sessionId, userId);
  }

  async leaveSession(userId: string, sessionId: string): Promise<Session | null> {
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    
    if (!session.participants.includes(userId as any)) {
      throw new BadRequestException('You are not a participant in this session');
    }
    
    return this.sessionsRepository.removeParticipant(sessionId, userId);
  }

  /**
   * Update session metadata (for background processes)
   * This method allows updating session metadata without user authorization
   */
  async updateSessionMetadata(sessionId: string, metadata: string[]): Promise<void> {
    this.logger.log(`Updating session metadata for session: ${sessionId}`);
    this.logger.log(`Metadata: ${JSON.stringify(metadata)}`);

    const session = await this.sessionsRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Update the session with the new metadata
    await this.sessionsRepository.update(sessionId, { metadata });
    
    this.logger.log(`Session metadata updated successfully for session: ${sessionId}`);
  }

  /**
   * Get suggested sessions based on current user's learnable skills
   */
  async getSuggestedSessions(userId: string) {
    this.logger.log(`Getting suggested sessions for user: ${userId}`);

    try {
      // Get current user's learnable skills (type: 'learning') and their metadata
      const userLearningSkills = await this.skillModel.find({
        userId: userId,
        type: 'learning'
      }).exec();

      this.logger.log(`Found ${userLearningSkills.length} learning skills for user`);

      const allSuggestedSessions = new Map();

      // Find sessions that match user's learning needs
      if (userLearningSkills.length > 0) {
        this.logger.log('Processing learning skills to find matching sessions...');
        
        // Extract all metadata keywords from user's learning skills
        const learningMetadataKeywords = userLearningSkills
          .flatMap(skill => skill.metadata || [])
          .filter(keyword => keyword && keyword.trim() !== '');

        this.logger.log(`Extracted learning metadata keywords: ${JSON.stringify(learningMetadataKeywords)}`);

        if (learningMetadataKeywords.length > 0) {
          // Call Python API to get matching keywords for learning skills
          const learningMatchingKeywords = await this.pythonApiService.searchKeywords(learningMetadataKeywords);
          
          this.logger.log(`Python API returned learning matching keywords: ${JSON.stringify(learningMatchingKeywords)}`);

          if (learningMatchingKeywords.length > 0) {
            // Split each keyword by comma and flatten into a single array
            const expandedLearningKeywords = learningMatchingKeywords
              .flatMap(keyword => keyword.split(','))
              .map(keyword => keyword.trim())
              .filter(keyword => keyword !== '');

            this.logger.log(`Expanded learning keywords: ${JSON.stringify(expandedLearningKeywords)}`);

            // Find sessions that contain at least 1 of the expanded keywords in their metadata
            const matchingSessions = await this.sessionsRepository.findSessionsByKeywords(
              expandedLearningKeywords,
              userId, // Exclude current user's sessions
              1 // Minimum 1 keyword must match
            );

            this.logger.log(`Found ${matchingSessions.length} matching sessions for user's learning needs`);

            // Add sessions to the suggested sessions map
            matchingSessions.forEach(session => {
              const sessionKey = (session as any)._id.toString();
              if (!allSuggestedSessions.has(sessionKey)) {
                allSuggestedSessions.set(sessionKey, {
                  ...(session as any).toObject(),
                  matchingType: 'learning_match' // Sessions that match what user wants to learn
                });
              }
            });
          }
        }
      }

      const suggestedSessions = Array.from(allSuggestedSessions.values());
      
      this.logger.log(`Returning ${suggestedSessions.length} total suggested sessions based on learning needs`);

      return {
        success: true,
        data: suggestedSessions
      };

    } catch (error) {
      this.logger.error(`Error getting suggested sessions for user ${userId}: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);
      throw error;
    }
  }
}