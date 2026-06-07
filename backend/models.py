from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    VICE_ADMIN = "vice_admin"
    PLAYER = "player"


class BetType(str, enum.Enum):
    MATCH_RESULT = "match_result"
    GROUP_ADVANCE = "group_advance"
    CHAMPION = "champion"


class BetStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    SETTLED = "settled"


class TournamentPhase(str, enum.Enum):
    GROUP = "group"
    KNOCKOUT = "knockout"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.PLAYER.value)
    balance = Column(Float, default=10000.0)
    loans_group_stage = Column(Integer, default=0)
    loans_knockout = Column(Integer, default=0)
    outstanding_loan = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    bets = relationship("UserBet", back_populates="user")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    name_cn = Column(String(50), nullable=False)
    flag = Column(String(10), nullable=False)
    group_name = Column(String(5), nullable=False)
    played = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    draws = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    goals_for = Column(Integer, default=0)
    goals_against = Column(Integer, default=0)
    points = Column(Integer, default=0)
    eliminated = Column(Boolean, default=False)


class KnockoutMatch(Base):
    __tablename__ = "knockout_matches"

    id = Column(Integer, primary_key=True, index=True)
    round_name = Column(String(20), nullable=False)
    match_order = Column(Integer, nullable=False)
    team1_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    team2_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    team1_placeholder = Column(String(50), default="待定")
    team2_placeholder = Column(String(50), default="待定")
    winner_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    score1 = Column(Integer, nullable=True)
    score2 = Column(Integer, nullable=True)
    next_match_id = Column(Integer, ForeignKey("knockout_matches.id"), nullable=True)
    next_match_slot = Column(Integer, nullable=True)

    team1 = relationship("Team", foreign_keys=[team1_id])
    team2 = relationship("Team", foreign_keys=[team2_id])
    winner = relationship("Team", foreign_keys=[winner_id])


class BettingEvent(Base):
    __tablename__ = "betting_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    bet_type = Column(String(20), nullable=False)
    status = Column(String(20), default=BetStatus.OPEN.value)
    deadline = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    settled_at = Column(DateTime, nullable=True)
    winning_option_id = Column(Integer, ForeignKey("betting_options.id"), nullable=True)

    options = relationship("BettingOption", back_populates="event", foreign_keys="BettingOption.event_id")
    user_bets = relationship("UserBet", back_populates="event")


class BettingOption(Base):
    __tablename__ = "betting_options"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("betting_events.id"), nullable=False)
    label = Column(String(100), nullable=False)
    odds = Column(Float, nullable=False)

    event = relationship("BettingEvent", back_populates="options", foreign_keys=[event_id])
    user_bets = relationship("UserBet", back_populates="option")


class UserBet(Base):
    __tablename__ = "user_bets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("betting_events.id"), nullable=False)
    option_id = Column(Integer, ForeignKey("betting_options.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payout = Column(Float, default=0.0)
    won = Column(Boolean, nullable=True)
    placed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="bets")
    event = relationship("BettingEvent", back_populates="user_bets")
    option = relationship("BettingOption", back_populates="user_bets")


class LoanRecord(Base):
    __tablename__ = "loan_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    phase = Column(String(20), nullable=False)
    repaid = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    repaid_at = Column(DateTime, nullable=True)

    user = relationship("User")


class WeeklySnapshot(Base):
    __tablename__ = "weekly_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_value = Column(Float, nullable=False)
    snapshot_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(String(200), nullable=False)
