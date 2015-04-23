#!/bin/bash

curl -v -G -d "query=Montmartre&intent=global&client_id=4PE40GCZEXZHXNKO2DYW11HIMSIT4054GW5H1CM12JYMNUQJ&client_secret=KGMG5BLMV50KUR0OOPKTTTOFMLU2TGEC3WOW2FDNBRIW5ZRJ&v=20150315" https://api.foursquare.com/v2/venues/search
#curl -v -k -G -d "sort=recent&limit=100&client_id=4PE40GCZEXZHXNKO2DYW11HIMSIT4054GW5H1CM12JYMNUQJ&client_secret=KGMG5BLMV50KUR0OOPKTTTOFMLU2TGEC3WOW2FDNBRIW5ZRJ&v=20150315" https://api.foursquare.com/v2/venues/516863b1011ca6684e37a88f/tips
