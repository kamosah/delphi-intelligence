"""Factory Boy factories for test data generation."""

import factory
from factory.fuzzy import FuzzyChoice
from faker import Faker

from app.models import (
    Document,
    DocumentStatus,
    Message,
    MessageRole,
    Organization,
    OrganizationMember,
    OrganizationRole,
    Space,
    SpaceMember,
    MemberRole,
    Thread,
    ThreadStatus,
    User,
    UserRole,
)

fake = Faker()


class UserFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating User instances."""

    class Meta:
        model = User
        sqlalchemy_session_persistence = "flush"

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    full_name = factory.LazyAttribute(lambda _: fake.name())
    is_active = True
    role = UserRole.MEMBER


class OrganizationFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating Organization instances."""

    class Meta:
        model = Organization
        sqlalchemy_session_persistence = "flush"

    name = factory.Sequence(lambda n: f"Organization {n}")
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(" ", "-"))
    description = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=200))
    owner = factory.SubFactory(UserFactory)


class OrganizationMemberFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating OrganizationMember instances."""

    class Meta:
        model = OrganizationMember
        sqlalchemy_session_persistence = "flush"

    user = factory.SubFactory(UserFactory)
    organization = factory.SubFactory(OrganizationFactory)
    role = FuzzyChoice([OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MEMBER])
    is_default = False


class SpaceFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating Space instances."""

    class Meta:
        model = Space
        sqlalchemy_session_persistence = "flush"

    name = factory.Sequence(lambda n: f"Space {n}")
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(" ", "-"))
    description = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=200))
    organization = factory.SubFactory(OrganizationFactory)
    owner = factory.SubFactory(UserFactory)


class SpaceMemberFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating SpaceMember instances."""

    class Meta:
        model = SpaceMember
        sqlalchemy_session_persistence = "flush"

    space = factory.SubFactory(SpaceFactory)
    user = factory.SubFactory(UserFactory)
    role = FuzzyChoice([MemberRole.OWNER, MemberRole.EDITOR, MemberRole.VIEWER])


class DocumentFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating Document instances."""

    class Meta:
        model = Document
        sqlalchemy_session_persistence = "flush"

    name = factory.Sequence(lambda n: f"document_{n}.pdf")
    file_type = "application/pdf"
    file_path = factory.LazyAttribute(lambda obj: f"/uploads/{obj.name}")
    size_bytes = 1024
    status = DocumentStatus.UPLOADED
    space = factory.SubFactory(SpaceFactory)
    uploader = factory.SubFactory(UserFactory)


class ThreadFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating Thread instances."""

    class Meta:
        model = Thread
        sqlalchemy_session_persistence = "flush"

    query_text = factory.LazyAttribute(lambda _: fake.sentence())
    title = factory.LazyAttribute(lambda _: fake.sentence(nb_words=4))
    status = ThreadStatus.PENDING
    organization = factory.SubFactory(OrganizationFactory)
    creator = factory.SubFactory(UserFactory)
    space = factory.SubFactory(SpaceFactory)


class MessageFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating Message instances."""

    class Meta:
        model = Message
        sqlalchemy_session_persistence = "flush"

    content = factory.LazyAttribute(lambda _: fake.paragraph())
    role = FuzzyChoice([MessageRole.USER, MessageRole.ASSISTANT, MessageRole.SYSTEM])
    thread = factory.SubFactory(ThreadFactory)
