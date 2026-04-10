from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, TextHistory
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'viceversa-secret-key-2024'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///viceversa.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Create tables
with app.app_context():
    db.create_all()

@app.route('/', methods=['GET'])
def index():
    if 'user_id' in session:
        return redirect(url_for('app_page'))
    return render_template('index.html')

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username already exists'})
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already exists'})
    
    try:
        user = User(
            username=username,
            email=email,
            password=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Account created successfully!'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Error creating account'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        session['user_id'] = user.id
        session['username'] = user.username
        return jsonify({'success': True, 'message': f'Welcome back, {user.username}!'})
    return jsonify({'success': False, 'message': 'Invalid credentials'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/app')
def app_page():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('app.html', username=session.get('username'))

@app.route('/save-text', methods=['POST'])
def save_text():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.json
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({'success': False, 'message': 'Text cannot be empty'})
    
    try:
        history = TextHistory(text=text, user_id=session['user_id'])
        db.session.add(history)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Text saved successfully!'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Error saving text'})

@app.route('/history')
def history():
    if 'user_id' not in session:
        return jsonify({'history': []}), 401
    
    histories = TextHistory.query.filter_by(user_id=session['user_id'])\
        .order_by(TextHistory.timestamp.desc())\
        .limit(10).all()
    
    history_list = [{
        'id': h.id,
        'text': h.text,
        'timestamp': h.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    } for h in histories]
    
    return jsonify({'history': history_list})

if __name__ == '__main__':
    app.run(debug=True)