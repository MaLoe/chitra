#!/usr/bin/env python3

import os
from subprocess import call

# this script takes the icon.xcf and generates a bunch of pngs

print("generating temporary png file")
call(["xcf2png", "icon.xcf", "-o", "icon_big_tmp.png"])

aIcons = [
		dict(size="128x128", fp="../www/icon.png"),
		dict(size="36x36", fp="../www/res/icon/android/icon-36-ldpi.png"),
		dict(size="48x48", fp="../www/res/icon/android/icon-48-mdpi.png"),
		dict(size="72x72", fp="../www/res/icon/android/icon-72-hdpi.png"),
		dict(size="96x96", fp="../www/res/icon/android/icon-96-xhdpi.png"),
		dict(size="57x57", fp="../www/res/icon/ios/icon-57.png"),
		dict(size="72x72", fp="../www/res/icon/ios/icon-72.png"),
		dict(size="114x114", fp="../www/res/icon/ios/icon-57-2x.png"),
		dict(size="144x144", fp="../www/res/icon/ios/icon-72-2x.png"),
		dict(size="48x48", fp="../www/res/icon/windows-phone/icon-48.png"),
		dict(size="62x62", fp="../www/res/icon/windows-phone/icon-62-tile.png"),
		dict(size="173x173", fp="../www/res/icon/windows-phone/icon-173-tile.png")
		]

for dIcon in aIcons:
	print("generating icon:", dIcon["fp"])
	sDir = os.path.dirname(dIcon["fp"])
	if not os.path.exists(sDir):
		os.makedirs(sDir)
	call(["convert", "icon_big_tmp.png", "-resize", dIcon["size"], dIcon["fp"]])

print("cleaning up")
os.remove("icon_big_tmp.png")

print("done, have a nice day!")
