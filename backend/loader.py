from flask import Flask, jsonify

app = Flask(__name__)

# GET /hello endpoint
@app.route('/hello')
def hello():
    return jsonify(message="Hello")

if __name__ == '__main__':
    app.run()
