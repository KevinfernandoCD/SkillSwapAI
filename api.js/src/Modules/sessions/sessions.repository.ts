import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class SessionsRepository {
  constructor(@InjectModel(Session.name) private sessionModel: Model<SessionDocument>) {}

  async create(createSessionDto: CreateSessionDto & { hostId: string }): Promise<Session> {
    const session = new this.sessionModel(createSessionDto);
    return session.save();
  }

  async findByUserId(userId: string, paginationDto: PaginationDto): Promise<PaginatedResult<Session>> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { hostId: userId },
        { participants: userId }
      ]
    };

    const [data, total] = await Promise.all([
      this.sessionModel
        .find(query)
        .populate('hostId', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('teachSkillId', 'name category proficiency type description agenda')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.sessionModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findUpcomingSessions(userId: string, startDate: string, endDate: string, paginationDto?: PaginationDto): Promise<PaginatedResult<Session>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    const query = {
      $and: [
        {
          $or: [
            { hostId: userId },
            { participants: userId }
          ]
        },
        {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        },
        {
          status: 'upcoming'
        }
      ]
    };

    const [data, total] = await Promise.all([
      this.sessionModel
        .find(query)
        .populate('hostId', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('teachSkillId', 'name category proficiency type description agenda')
        .skip(skip)
        .limit(limit)
        .sort({ date: 1, startTime: 1 }) // Sort by date and time ascending
        .exec(),
      this.sessionModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPublic(paginationDto: PaginationDto): Promise<PaginatedResult<Session>> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.sessionModel
        .find({ isPublic: true, status: 'upcoming' })
        .populate('hostId', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('teachSkillId', 'name category proficiency type description agenda')
        .skip(skip)
        .limit(limit)
        .sort({ date: 1 })
        .exec(),
      this.sessionModel.countDocuments({ isPublic: true, status: 'upcoming' }).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Session | null> {
    return this.sessionModel
      .findById(id)
      .populate('hostId', 'name email avatar')
      .populate('participants', 'name email avatar')
      .populate('teachSkillId', 'name category proficiency type description agenda')
      .exec();
  }

  async update(id: string, updateSessionDto: UpdateSessionDto): Promise<Session | null> {
    return this.sessionModel
      .findByIdAndUpdate(id, updateSessionDto, { new: true })
      .populate('hostId', 'name email avatar')
      .populate('participants', 'name email avatar')
      .populate('teachSkillId', 'name category proficiency type description agenda')
      .exec();
  }

  async remove(id: string): Promise<void> {
    await this.sessionModel.findByIdAndDelete(id).exec();
  }

  async search(query: string, status?: string, paginationDto?: PaginationDto): Promise<PaginatedResult<Session>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    const searchRegex = new RegExp(query, 'i');
    const searchQuery: any = {
      $or: [
        { title: searchRegex },
        { skillCategory: searchRegex },
        { description: searchRegex },
      ],
    };

    if (status && ['upcoming', 'completed', 'cancelled'].includes(status)) {
      searchQuery.status = status;
    }

    const [data, total] = await Promise.all([
      this.sessionModel
        .find(searchQuery)
        .populate('hostId', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('teachSkillId', 'name category proficiency type description agenda')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.sessionModel.countDocuments(searchQuery).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a session by a short 4-character code derived from the ObjectId
   * - Matches either the last 4 hex characters of the _id
   * - Or an exact 4-character suffix match on the _id string (case-insensitive)
   */
  async findByCode(code: string): Promise<Session | null> {
    // Normalize code to lowercase for hex comparisons
    const normalized = (code || '').toLowerCase();

    // Aggregate to compute last 4 hex of ObjectId and match
    const results = await (this.sessionModel as any).aggregate([
      { $addFields: { idStr: { $toString: '$_id' } } },
      { $addFields: { last4Hex: { $substr: ['$idStr', 20, 4] } } },
      { $match: { $or: [
        { last4Hex: normalized },
        { idStr: { $regex: `${normalized}$`, $options: 'i' } },
      ] } },
      { $limit: 1 },
    ]).exec();

    if (!results || results.length === 0) {
      return null;
    }

    const foundId = results[0]._id;
    return this.findById(String(foundId));
  }
  async addParticipant(sessionId: string, userId: string): Promise<Session | null> {
    return this.sessionModel
      .findByIdAndUpdate(
        sessionId,
        { $addToSet: { participants: userId } },
        { new: true }
      )
      .populate('hostId', 'name email avatar')
      .populate('participants', 'name email avatar')
      .populate('teachSkillId', 'name category proficiency type description agenda')
      .exec();
  }

  async removeParticipant(sessionId: string, userId: string): Promise<Session | null> {
    return this.sessionModel
      .findByIdAndUpdate(
        sessionId,
        { $pull: { participants: userId } },
        { new: true }
      )
      .populate('hostId', 'name email avatar')
      .populate('participants', 'name email avatar')
      .populate('teachSkillId', 'name category proficiency type description agenda')
      .exec();
  }

  /**
   * Find sessions that contain at least a minimum number of keywords in their metadata
   * @param keywords Array of keywords to search for
   * @param excludeUserId User ID to exclude from results (current user's sessions)
   * @param minMatches Minimum number of keywords that must match
   */
  async findSessionsByKeywords(keywords: string[], excludeUserId: string, minMatches: number = 1): Promise<Session[]> {
    // Create a query that finds sessions where metadata contains at least minMatches keywords

    const query = {
      hostId: { $ne: excludeUserId }, // Exclude current user's sessions
      status: 'upcoming', // Only upcoming sessions
      isPublic: true, // Only public sessions
      metadata: { $exists: true, $ne: null }, // Sessions must have metadata
      $expr: {
        $gte: [
          {
            $size: {
              $setIntersection: ['$metadata', keywords]
            }
          },
          minMatches
        ]
      }
    };

    return this.sessionModel
      .find(query)
      .populate('hostId', 'name email avatar')
      .populate('participants', 'name email avatar')
      .populate('teachSkillId', 'name category proficiency type description agenda')
      .sort({ date: 1, startTime: 1 }) // Sort by date and time ascending
      .limit(20) // Limit to 20 results
      .exec();
  }
}