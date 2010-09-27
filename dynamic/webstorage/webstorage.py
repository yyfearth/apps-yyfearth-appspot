# coding=utf-8
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from datetime import datetime
from django.utils import simplejson

import zlib, urllib

def html_header(self):
	self.response.headers['Content-Type'] = 'text/html; charset=utf-8'
	self.response.headers["Pragma"] = "no-cache"
	self.response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, pre-check=0, post-check=0"
	self.response.headers["Expires"] = "Thu, 01 Dec 1994 16:00:00"
	self.response.out.write('<!DOCTYPE html>')

def post_message(self, obj_json):
	self.response.out.write('<script type="text/javascript">if(window.parent) window.parent.postMessage(\'%s\',\'*\')</script>' % simplejson.dumps(obj_json).replace('\\', '\\\\').replace("'", "\\'"))

class WebStorage(db.Model):
	name = db.StringProperty(multiline=False)
	title = db.StringProperty(multiline=False)
	desc = db.TextProperty()
	owner = db.UserProperty()
	len = db.IntegerProperty()
	hash = db.StringProperty(multiline=False)
	cmprs = db.StringProperty(multiline=False)
	data = db.BlobProperty()
	date = db.DateTimeProperty(auto_now_add=True)

class WSHomeHandler(webapp.RequestHandler):
	def get(self, slash):
		if (not slash): self.redirect(self.request.url + '/')
		user = users.get_current_user()
		if not user:
			self.redirect(users.create_login_url('/webstorage/login'))
		else:
			html_header(self)
			self.response.out.write('User: ' + user.nickname() + '.<br/>webstorage home page')

class WSUserHandler(webapp.RequestHandler):
	def get(self):
		user = users.get_current_user()
		if not user:
			self.redirect(users.create_login_url(self.request.uri))
		else:
			html_header(self)
			post_message(self, {'method': 'login', 'user': user.email(), 'nickname': user.nickname()});
			self.response.out.write('User %s Logined!' % user.email());

class WebStorageHandler(webapp.RequestHandler):
	def get(self, key):
		user = users.get_current_user()
		if not user:
			self.redirect(users.create_login_url('/webstorage/login'))
			return
		key = urllib.unquote(key).lower()
		webstorage = WebStorage.get_by_key_name('%s (%s)' % (key, user.email()))
		html_header(self)
		if not webstorage:
			post_message(self, {'method': 'get', 'err': 'no_such_name'});
			self.response.out.write('no data named "%s" owned by "%s" was found!' % (key, user.email()))
			return
		json = {
			'method': 'get',
			'name': webstorage.name,
			'owner': webstorage.owner.email(),
			'title': webstorage.title, # already unicode
			'desc': webstorage.desc, # already unicode
			'len': webstorage.len,
			'hash': webstorage.hash,
			'date': webstorage.date.strftime('%c'),
			'data': unicode(zlib.decompress(webstorage.data), 'utf-8') # must unicode
		}
		post_message(self, json);
		if len(json['data']) > 50:
			json['data_preview'] = json['data'][:50] + '...'
		else:
			json['data_preview'] = json['data']
		json['desc'] = json['desc'].replace('\n', '<br/>')
		self.response.out.write('<h3>Get data successful!</h3><table style="font-size:12px"><caption style="font-weight:bold">Data Info</caption><tr><td align="right" width="50px">Name:</td><td>%(name)s</td></tr><tr><td align="right">Owner:</td><td>%(owner)s</td></tr><tr><td align="right">Title:</td><td>%(title)s</td></tr><tr><td align="right">Desc:</td><td>%(desc)s</td></tr><tr><td align="right">Len:</td><td>%(len)d</td></tr><tr><td align="right">SHA-1:</td><td>%(hash)s</td></tr><tr><td align="right">Date:</td><td>%(date)s</td></tr><tr><td align="right">Data:</td><td>%(data_preview)s</td></tr></table>' % json)

	def post(self, key):
		from xml.sax.saxutils import unescape
		user = users.get_current_user()
		if not user:
			self.redirect(users.create_login_url('/webstorage/login'))
			return
		self.request.charset = 'utf-8'
		key = urllib.unquote(key).lower()
		data = unescape(self.request.get('data')).encode('utf-8').replace('\r', '')
		webstorage = WebStorage(key_name = '%s (%s)' % (key, user.email()))
		webstorage.name = key
		webstorage.title = unicode(unescape(self.request.get('title')).encode('utf-8').replace('\r', ''), 'utf-8')
		webstorage.desc = db.Text(unescape(self.request.get('desc')).encode('utf-8').replace('\r', ''), 'utf-8')
		webstorage.owner = user
		webstorage.len = len(data)
		webstorage.hash = self.sha1(data)
		webstorage.cmprs = 'zlib'
		webstorage.data = zlib.compress(data)
		webstorage.put()
		post_message(self, {'method': 'post', 'ret': 'ok'});
		self.response.out.write(user.nickname() + ': your data successful uploaded!')

	def sha1(self, src):
		import hashlib
		my_sha1 = hashlib.sha1()
		my_sha1.update(src)
		return my_sha1.hexdigest()

def main():
	application = webapp.WSGIApplication([
		('/webstorage/login', WSUserHandler),
		('/webstorage/([\w\+-]+)', WebStorageHandler),
		('/webstorage(/?).*', WSHomeHandler)
	],debug=True)
	run_wsgi_app(application)

if __name__ == '__main__':
	main()