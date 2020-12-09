import os

from flask import Flask, request, jsonify, render_template
from faker import Faker
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import SyncGrant

app = Flask(__name__)
fake = Faker()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/token')
def generate_token():
    # get credentials from environment variables
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    api_key = os.getenv('TWILIO_API_KEY')
    api_secret = os.getenv('TWILIO_API_SECRET')
    sync_service_sid = os.getenv('TWILIO_SYNC_SERVICE_SID', 'default')
    username = request.args.get('username', fake.user_name())

    # create access token with credentials
    token = AccessToken(account_sid, api_key, api_secret, identity=username)
    # create a Sync grant and add to token
    sync_grant = SyncGrant(sync_service_sid)
    token.add_grant(sync_grant)
    return jsonify(identity=username, token=token.to_jwt().decode())
