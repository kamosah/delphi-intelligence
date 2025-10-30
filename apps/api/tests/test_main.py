"""
Test suite for FastAPI main application
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestRoot:
    """Test root endpoint"""

    def test_root_endpoint(self):
        """Test the root endpoint returns correct response"""
        response = client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "environment" in data
        assert data["version"] == "0.1.0"


class TestHealth:
    """Test health check endpoints"""

    def test_health_basic(self):
        """Test basic health check endpoint"""
        response = client.get("/health/")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "olympus-api"
        assert data["version"] == "0.1.0"
        assert "timestamp" in data
        assert "environment" in data

    def test_health_detailed(self):
        """Test detailed health check endpoint"""
        response = client.get("/health/detailed")
        assert response.status_code == 200

        data = response.json()
        assert "status" in data
        assert "service" in data
        assert "dependencies" in data
        assert data["service"] == "olympus-api"

    def test_readiness_probe(self):
        """Test Kubernetes readiness probe endpoint"""
        response = client.get("/health/readiness")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "ready"
        assert data["service"] == "olympus-api"
        assert "timestamp" in data

    def test_liveness_probe(self):
        """Test Kubernetes liveness probe endpoint"""
        response = client.get("/health/liveness")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "alive"
        assert data["service"] == "olympus-api"
        assert "timestamp" in data


class TestAPIDocumentation:
    """Test API documentation endpoints"""

    def test_openapi_json(self):
        """Test OpenAPI JSON schema endpoint"""
        response = client.get("/openapi.json")
        assert response.status_code == 200

        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert data["info"]["title"] == "Olympus MVP API"

    def test_docs_endpoint(self):
        """Test API documentation endpoint"""
        response = client.get("/docs")
        assert response.status_code == 200
        # Should return HTML content
        assert "text/html" in response.headers["content-type"]

    def test_redoc_endpoint(self):
        """Test ReDoc documentation endpoint"""
        response = client.get("/redoc")
        assert response.status_code == 200
        # Should return HTML content
        assert "text/html" in response.headers["content-type"]
