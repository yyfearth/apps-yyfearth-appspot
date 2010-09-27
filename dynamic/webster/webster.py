# -*- coding: utf-8 -*-
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext import db

import sys, os, urllib, re, zlib

class MyOpener(urllib.URLopener, object):
	version = 'Mozilla/5.0 (Windows; U; Windows NT 5.1) Gecko/20071127 Firefox/3.0.0.0'

class WebsterCache(db.Model):
	word = db.StringProperty(multiline=False)
	content = db.BlobProperty()
	date = db.DateTimeProperty(auto_now_add=True)

class SearchHandler(webapp.RequestHandler):
	def get(self, slash):
		if (not slash): self.redirect(self.request.url + '/')
		self.response.headers['Content-Type'] = 'text/html; charset=utf-8'
		self.response.out.write('Dictionary: <form onsubmit="var val;if(val=document.getElementById(\'word\').value){location.href=val};return false"><input id="word" value="Webster" type="text"/><input type="submit" value="GO!"/></form>')

class ErrorHandler(webapp.RequestHandler):
	def get(self):
		self.response.out.write('bad request: ' + self.request.path)

class CacheHandler(webapp.RequestHandler):
	word = None # unicode
	title = None
	content = None
	entry = None
	site_url = 'http://www.merriam-webster.com',
	base_url = 'http://www.merriam-webster.com/dictionary/'
	html_wrap = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><title>%(word)s - Definition and More from the Free Merriam-Webster Dictionary (Cached)</title><link rel="stylesheet" href="webster.css" type="text/css"/></head><body><div id="content">%(content)s</div><p>Source: <a href="%(url)s">%(url)s</a><br/>All data provided by <a href="http://www.merriam-webster.com">www.merriam-webster.com</a></p></body></html>'
	def fetch(self):
		# fetch source html from http://www.merriam-webster.com #
		if (not self.word): return None
		MyOpener.version = str(self.request.headers['User-Agent'])
		try:
			urlopen = MyOpener()
			fp = urlopen.open(self.url)
			html = fp.read()
			fp.close()
		except:
			html = None
		self.source = html
		return html
	
	def pick(self):
		if (not self.source): return None
		#try:
		sys.path.append(os.path.dirname(os.path.abspath(__file__))) # script dir
		from BeautifulSoup import BeautifulSoup
		soup = BeautifulSoup(self.source)
		for e in soup.findAll('object'): e.extract() # remove flash
		self.source = str(soup)
		content = soup.find('div', 'definition')
		if (not content):
			spelling_help = soup.find('div', 'spelling-help')
			if (spelling_help):
				div = spelling_help.find('div', 'franklin-promo')
				if (div): div.extract()
				for a in spelling_help.findAll(href=re.compile('^/dictionary/')):
					a['href'] = a['href'].replace('/dictionary/', '')
				self.content = str(spelling_help)
			else:
				self.content = None
				soup.head.insert(1, 'base')
				soup.head.base['href'] = self.base_url
			return None
		div = content.find('div', 'browse')
		if (div): div.extract()
		div = content.find('div', 'britannica-entry')
		if (div): div.extract()
		for e in content.findAll(['input', 'script']): e.extract()
		for a in content.findAll(href='#'): a.extract()
		for a in content.findAll(href=re.compile('^/thesaurus/')): a.extract()
		for a in content.findAll(href=re.compile('^/dictionary/')):
			a['href'] = a['href'].replace('/dictionary/', '')
		for e in content.findAll(onclick=True): del(e['onclick'])
		for e in content.findAll('img'):
			src = str(e['src'])
			if src.startswith('/'):
				e['src'] = self.site_url + src
			else:
				e['src'] = self.base_url + src
		div = content.find(id='wordclickDiv')
		if (div):
			indiv = content.find(id='mwEntryData')
			if (indiv): div.replaceWith(indiv)
		#except:
		#	return None
		self.content = str(content).replace('\n','')
		return self.content
	
	def wrap(self):
		if (not self.content): return None
		html = (self.html_wrap % {'word': self.word.capitalize().encode('utf-8'), 'content': self.content, 'url': urllib.unquote(self.url)})
		self.view = html
		return html
	
	def store(self):
		if (not self.word or not self.content): return None
		entry = WebsterCache.get_by_key_name(self.word)
		if (not entry):
			entry = WebsterCache(key_name = self.word)
			entry.word = self.word
			entry.content = zlib.compress(self.content, 9)
			entry.put()
		self.entry = entry
		return entry
	
	def restore(self):
		if (not self.word): return None
		self.entry = WebsterCache.get_by_key_name(self.word)
		if (self.entry):
			self.content = zlib.decompress(self.entry.content)
			return self.entry
		else:
			return None
	
	def get(self, word, slash):
		if (slash):
			self.redirect(self.request.url[:-1])
			return
		self.response.headers['Content-Type'] = 'text/html; charset=utf-8'
		if (word):
			self.word = urllib.unquote(word).decode('utf-8').lower() # urllib.unquote(word).lower()
			self.url = self.base_url + word.lower() # do not urldecode word
			if (self.restore()):
				self.response.out.write(self.wrap())
			elif (self.fetch()):
				if (self.pick()):
					self.store() # save cache
					self.response.out.write(self.wrap())
				elif (self.content): # other content
					self.response.out.write(self.wrap())
				else:
					self.response.out.write(self.source)
			else:
				self.redirect(self.url);
		else:
			self.response.out.write('no word request!')

def main():
	application = webapp.WSGIApplication([
		('/webster(/?)', SearchHandler),
		('/webster/([^/]*)(/?)', CacheHandler),
		('/webster/.*', ErrorHandler)
	],debug=True)
	util.run_wsgi_app(application)

if __name__ == '__main__':
	main()
