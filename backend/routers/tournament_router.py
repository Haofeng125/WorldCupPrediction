from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Team, KnockoutMatch, User
from auth import require_admin

router = APIRouter(prefix="/api/tournament", tags=["tournament"])


class UpdateTeamRequest(BaseModel):
    played: Optional[int] = None
    wins: Optional[int] = None
    draws: Optional[int] = None
    losses: Optional[int] = None
    goals_for: Optional[int] = None
    goals_against: Optional[int] = None
    points: Optional[int] = None
    eliminated: Optional[bool] = None


class UpdateKnockoutRequest(BaseModel):
    team1_id: Optional[int] = None
    team2_id: Optional[int] = None
    score1: Optional[int] = None
    score2: Optional[int] = None
    winner_id: Optional[int] = None


@router.get("/groups")
def get_groups(db: Session = Depends(get_db)):
    teams = db.query(Team).order_by(Team.group_name, Team.points.desc(), (Team.goals_for - Team.goals_against).desc(), Team.goals_for.desc()).all()
    groups = {}
    for t in teams:
        g = t.group_name
        if g not in groups:
            groups[g] = []
        groups[g].append({
            "id": t.id,
            "name": t.name,
            "name_cn": t.name_cn,
            "flag": t.flag,
            "played": t.played,
            "wins": t.wins,
            "draws": t.draws,
            "losses": t.losses,
            "goals_for": t.goals_for,
            "goals_against": t.goals_against,
            "goal_diff": t.goals_for - t.goals_against,
            "points": t.points,
            "eliminated": t.eliminated,
        })
    return groups


@router.get("/teams")
def get_all_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).order_by(Team.group_name, Team.name_cn).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "name_cn": t.name_cn,
            "flag": t.flag,
            "group_name": t.group_name,
        }
        for t in teams
    ]


@router.put("/teams/{team_id}")
def update_team(team_id: int, req: UpdateTeamRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="球队不存在")
    for field, val in req.model_dump(exclude_none=True).items():
        setattr(team, field, val)
    db.commit()
    return {"message": "更新成功"}


@router.get("/knockout")
def get_knockout(db: Session = Depends(get_db)):
    matches = db.query(KnockoutMatch).order_by(KnockoutMatch.round_name, KnockoutMatch.match_order).all()
    result = {}
    for m in matches:
        rn = m.round_name
        if rn not in result:
            result[rn] = []
        result[rn].append({
            "id": m.id,
            "match_order": m.match_order,
            "team1": _team_info(m.team1) if m.team1 else None,
            "team2": _team_info(m.team2) if m.team2 else None,
            "team1_placeholder": m.team1_placeholder,
            "team2_placeholder": m.team2_placeholder,
            "score1": m.score1,
            "score2": m.score2,
            "winner": _team_info(m.winner) if m.winner else None,
            "next_match_id": m.next_match_id,
        })
    return result


@router.put("/knockout/{match_id}")
def update_knockout(match_id: int, req: UpdateKnockoutRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    match = db.query(KnockoutMatch).filter(KnockoutMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="比赛不存在")
    for field, val in req.model_dump(exclude_none=True).items():
        setattr(match, field, val)
    if req.winner_id and match.next_match_id:
        next_match = db.query(KnockoutMatch).filter(KnockoutMatch.id == match.next_match_id).first()
        if next_match:
            if match.next_match_slot == 1:
                next_match.team1_id = req.winner_id
            else:
                next_match.team2_id = req.winner_id
    db.commit()
    return {"message": "更新成功"}


def _team_info(team: Team) -> dict:
    return {
        "id": team.id,
        "name": team.name,
        "name_cn": team.name_cn,
        "flag": team.flag,
    }
