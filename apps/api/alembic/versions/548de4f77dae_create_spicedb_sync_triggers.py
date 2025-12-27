"""create_spicedb_sync_triggers

Revision ID: 548de4f77dae
Revises: 34d2490c6293
Create Date: 2025-12-27 21:34:07.629279

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '548de4f77dae'
down_revision: Union[str, Sequence[str], None] = '34d2490c6293'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create function to write to outbox table when events occur
    # This function is called by triggers on authorization-relevant tables
    op.execute("""
        CREATE OR REPLACE FUNCTION notify_spicedb_sync()
        RETURNS TRIGGER AS $$
        DECLARE
            event_type_val auth_sync_event_type;
            event_data_val JSONB;
            record_id_val UUID;
        BEGIN
            -- Determine event type based on table and operation
            IF TG_TABLE_NAME = 'organizations' THEN
                IF TG_OP = 'INSERT' THEN
                    event_type_val := 'organization_created';
                    record_id_val := NEW.id;
                    event_data_val := jsonb_build_object(
                        'organization_id', NEW.id,
                        'owner_id', NEW.owner_id
                    );
                ELSIF TG_OP = 'DELETE' THEN
                    event_type_val := 'organization_deleted';
                    record_id_val := OLD.id;
                    event_data_val := jsonb_build_object(
                        'organization_id', OLD.id
                    );
                END IF;

            ELSIF TG_TABLE_NAME = 'organization_members' THEN
                IF TG_OP = 'INSERT' THEN
                    event_type_val := 'organization_member_added';
                    record_id_val := NEW.id;
                    event_data_val := jsonb_build_object(
                        'organization_id', NEW.organization_id,
                        'user_id', NEW.user_id,
                        'role', NEW.organization_role
                    );
                ELSIF TG_OP = 'UPDATE' THEN
                    -- Only trigger on role change
                    IF OLD.organization_role != NEW.organization_role THEN
                        event_type_val := 'organization_member_role_changed';
                        record_id_val := NEW.id;
                        event_data_val := jsonb_build_object(
                            'organization_id', NEW.organization_id,
                            'user_id', NEW.user_id,
                            'old_role', OLD.organization_role,
                            'new_role', NEW.organization_role
                        );
                    ELSE
                        RETURN NEW;  -- Skip if role didn't change
                    END IF;
                ELSIF TG_OP = 'DELETE' THEN
                    event_type_val := 'organization_member_removed';
                    record_id_val := OLD.id;
                    event_data_val := jsonb_build_object(
                        'organization_id', OLD.organization_id,
                        'user_id', OLD.user_id,
                        'role', OLD.organization_role
                    );
                END IF;

            ELSIF TG_TABLE_NAME = 'spaces' THEN
                IF TG_OP = 'INSERT' THEN
                    event_type_val := 'space_created';
                    record_id_val := NEW.id;
                    event_data_val := jsonb_build_object(
                        'space_id', NEW.id,
                        'organization_id', NEW.organization_id,
                        'owner_id', NEW.owner_id
                    );
                ELSIF TG_OP = 'DELETE' THEN
                    event_type_val := 'space_deleted';
                    record_id_val := OLD.id;
                    event_data_val := jsonb_build_object(
                        'space_id', OLD.id,
                        'organization_id', OLD.organization_id
                    );
                END IF;

            ELSIF TG_TABLE_NAME = 'space_members' THEN
                IF TG_OP = 'INSERT' THEN
                    event_type_val := 'space_member_added';
                    record_id_val := NEW.id;
                    event_data_val := jsonb_build_object(
                        'space_id', NEW.space_id,
                        'user_id', NEW.user_id,
                        'role', NEW.member_role
                    );
                ELSIF TG_OP = 'DELETE' THEN
                    event_type_val := 'space_member_removed';
                    record_id_val := OLD.id;
                    event_data_val := jsonb_build_object(
                        'space_id', OLD.space_id,
                        'user_id', OLD.user_id,
                        'role', OLD.member_role
                    );
                END IF;

            ELSIF TG_TABLE_NAME = 'documents' THEN
                IF TG_OP = 'INSERT' THEN
                    event_type_val := 'document_created';
                    record_id_val := NEW.id;
                    event_data_val := jsonb_build_object(
                        'document_id', NEW.id,
                        'space_id', NEW.space_id,
                        'uploaded_by', NEW.uploaded_by
                    );
                ELSIF TG_OP = 'DELETE' THEN
                    event_type_val := 'document_deleted';
                    record_id_val := OLD.id;
                    event_data_val := jsonb_build_object(
                        'document_id', OLD.id,
                        'space_id', OLD.space_id
                    );
                END IF;
            END IF;

            -- Insert into outbox table (transactionally safe)
            INSERT INTO auth_sync_outbox (
                event_type,
                table_name,
                record_id,
                event_data,
                status
            ) VALUES (
                event_type_val,
                TG_TABLE_NAME,
                record_id_val,
                event_data_val,
                'pending'
            );

            -- Return appropriate record for AFTER trigger
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Create triggers on organizations table
    op.execute("""
        CREATE TRIGGER spicedb_sync_organization_insert
        AFTER INSERT ON organizations
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    op.execute("""
        CREATE TRIGGER spicedb_sync_organization_delete
        AFTER DELETE ON organizations
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    # Create triggers on organization_members table
    op.execute("""
        CREATE TRIGGER spicedb_sync_organization_members_insert
        AFTER INSERT ON organization_members
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    op.execute("""
        CREATE TRIGGER spicedb_sync_organization_members_update
        AFTER UPDATE ON organization_members
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    op.execute("""
        CREATE TRIGGER spicedb_sync_organization_members_delete
        AFTER DELETE ON organization_members
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    # Create triggers on spaces table
    op.execute("""
        CREATE TRIGGER spicedb_sync_space_insert
        AFTER INSERT ON spaces
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    op.execute("""
        CREATE TRIGGER spicedb_sync_space_delete
        AFTER DELETE ON spaces
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    # Create triggers on space_members table
    op.execute("""
        CREATE TRIGGER spicedb_sync_space_members_insert
        AFTER INSERT ON space_members
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    op.execute("""
        CREATE TRIGGER spicedb_sync_space_members_delete
        AFTER DELETE ON space_members
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    # Create triggers on documents table
    op.execute("""
        CREATE TRIGGER spicedb_sync_document_insert
        AFTER INSERT ON documents
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)

    op.execute("""
        CREATE TRIGGER spicedb_sync_document_delete
        AFTER DELETE ON documents
        FOR EACH ROW
        EXECUTE FUNCTION notify_spicedb_sync();
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop triggers
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_document_delete ON documents")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_document_insert ON documents")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_space_members_delete ON space_members")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_space_members_insert ON space_members")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_space_delete ON spaces")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_space_insert ON spaces")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_organization_members_delete ON organization_members")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_organization_members_update ON organization_members")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_organization_members_insert ON organization_members")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_organization_delete ON organizations")
    op.execute("DROP TRIGGER IF EXISTS spicedb_sync_organization_insert ON organizations")

    # Drop function
    op.execute("DROP FUNCTION IF EXISTS notify_spicedb_sync()")
