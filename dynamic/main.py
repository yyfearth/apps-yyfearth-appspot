from google.appengine.ext import webapp
from google.appengine.ext.webapp import util

class HomeHandler(webapp.RequestHandler):
	def get(self):
		self.redirect('/apps/')

class AppsHandler(webapp.RequestHandler):
	def get(self, app):
		app = app.lower()
		if app in ['index', 'baeword', 'xmlcms', 'menuwiz', 'y-js-cal']:
			self.redirect('/apps/' + app)
		elif app.startswith('/apps/'):
			self.redirect(app)
		else:
			self.response.headers['Content-Type'] = 'text/html; charset=utf-8'
			self.response.out.write('<meta http-equiv="refresh" content="1; url=/" />')
			if app in ['static', 'dynamic']:
				self.response.out.write('403 Forbidden!')
			else: #self.response.set_status(404)
				self.response.out.write('404 Not Found!')
			self.response.out.write(' - GAE site of yyfearth.com<br/>Redirect to <a href="/">Home</a> in 1s...')

def main():
	application = webapp.WSGIApplication([
		('/', HomeHandler),
		('/index/?', HomeHandler),
		('/index\.html?', HomeHandler),
		('/apps', HomeHandler),
		('/(static|dynamic).*', AppsHandler),
		('(/apps/.+?)\.html?', AppsHandler),
		('/(.+?)/?', AppsHandler),
		('(.*)', AppsHandler)
	], debug=True)
	util.run_wsgi_app(application)

if __name__ == '__main__':
	main()
