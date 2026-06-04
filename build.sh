#!/bin/sh

# Longest edge (px) for generated gallery thumbnails.
THUMB_MAX=600

# Regenerate a gallery's data file and its thumbnails.
#   gen_gallery <image-dir> <data-file> <url-base>
# Writes one entry per file (nome + full link, plus a thumb for images) and
# generates a downscaled JPEG thumbnail under <image-dir>/thumbs/ for every
# non-video image. Thumbnails are only (re)built when missing or stale, and
# are gitignored (rebuilt fresh on each CI run).
gen_gallery()
{
	dir="$1"
	yaml="$2"
	urlbase="$3"

	mkdir -p "$dir/thumbs"
	echo "" > "$yaml"

	for FOTO in $(ls --sort=extension "$dir")
	do
		[ "$FOTO" = "thumbs" ] && continue
		[ -d "$dir/$FOTO" ] && continue

		{
			echo "-   nome: $FOTO"
			echo "    link: $urlbase/$FOTO"
		} >> "$yaml"

		case "$(echo "$FOTO" | tr 'A-Z' 'a-z')" in
			*.mp4)
				;; # videos have no image thumbnail
			*)
				thumb="$dir/thumbs/${FOTO%.*}.jpg"
				if [ ! -f "$thumb" ] || [ "$dir/$FOTO" -nt "$thumb" ]; then
					convert "$dir/$FOTO" -resize "${THUMB_MAX}x${THUMB_MAX}>" -quality 82 "$thumb"
				fi
				echo "    thumb: $urlbase/thumbs/${FOTO%.*}.jpg" >> "$yaml"
				;;
		esac

		echo "" >> "$yaml"
	done
}

uploadarquivos()
{
	gen_gallery images/fotos-skate  _data/skate.yml         /images/fotos-skate
	gen_gallery images/wallpapers   _data/wallpapers.yml    /images/wallpapers
	gen_gallery images/flores       _data/flores.yml        /images/flores
	gen_gallery images/minhas-fotos _data/minhas_fotos.yml  /images/minhas-fotos
	gen_gallery images/suspensao    _data/suspensao.yml     /images/suspensao
}

updatedates()
{

	cur_date="$(date +%Y-%m-%d)"

	for file in $(ls _blog)
	do
		[ -n "$(git diff "_blog/$file")" ] &&
		sed -i "s/^Atualizado em .*$/Atualizado em $cur_date/g" "_blog/$file"
	done
}

uploadarquivos
updatedates

bundle install &&
JEKYLL_ENV=production bundle exec jekyll build &&

cd _site && rm *.sh && cd ..
