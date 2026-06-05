"""change user_id to uuid

Revision ID: d180d47ca59d
Revises: 9435fc59e010
Create Date: 2026-06-05 03:13:02.092773

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



revision: str = 'd180d47ca59d'
down_revision: Union[str, Sequence[str], None] = '9435fc59e010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.alter_column('research_sessions', 'user_id',
            existing_type=sa.VARCHAR(),
            type_=sa.Uuid(as_uuid=False),
            existing_nullable=False,
            postgresql_using='user_id::uuid')

    pass



def downgrade() -> None:
    """Downgrade schema."""

    op.alter_column('research_sessions', 'user_id',
            existing_type=sa.Uuid(as_uuid=False),
            type_=sa.VARCHAR(),
            existing_nullable=False,
            postgresql_using='user_id::varchar')

    pass

