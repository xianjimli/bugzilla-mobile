mkdir temp
for f in *.png
do
	convert $f -resize 480x temp/$f
done
