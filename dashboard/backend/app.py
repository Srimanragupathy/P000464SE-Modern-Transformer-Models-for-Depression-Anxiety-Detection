from flask import Flask, jsonify
from flask_cors import CORS

from .routes.prediction import prediction_blueprint


def create_app():
    application = Flask(__name__)

    CORS(
        application,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ]
            }
        },
    )

    application.register_blueprint(
        prediction_blueprint
    )

    @application.get("/api/health")
    def health():
        return jsonify(
            {
                "status": "healthy",
                "service": "mental-health-dashboard-api",
            }
        )

    return application


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
    )