from flask import Flask, render_template, jsonify, abort
import os

app = Flask(__name__)

@app.route("/")
def home():
    # A raiz do site serve a LP geral da Connecta
    return render_template("geral.html")

@app.route("/<slug>")
def lp(slug):
    path = os.path.join("templates", f"{slug}.html")
    if not os.path.exists(path):
        abort(404)
    return render_template(f"{slug}.html")

@app.route("/lp/help")
def list_slugs():
    slug_list = [f for f in os.listdir("templates") if f.endswith(".html")]
    return {str(i): f.replace(".html", "") for i, f in enumerate(slug_list)}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)