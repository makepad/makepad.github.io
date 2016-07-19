/*
 * Parts Copyright 2014 OneJS
 * Parts Copyright 2012 Google, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Google Author(s): Behdad Esfahbod, Maysum Panju, Wojciech Baranowski
 */

#include <stdio.h>
#include <stdlib.h>

#include "glyphy.h"
#include "glyphy-common.hh"
#include "glyphy-geometry.hh"
#include "glyphy-arc-bezier.hh"
#include "glyphy-arcs-bezier.hh"

// so much nicer than a makefile
#include "glyphy-sdf.cc"
#include "glyphy-arc.cc"
#include "glyphy-arcs.cc"
#include "glyphy-blob.cc"
#include "glyphy-extents.cc"
#include "glyphy-outline.cc"

#include "glyphy-freetype.h"

struct glyph_info_t{
	glyphy_extents_t extents;

	double           advance;

	glyphy_bool_t    is_empty; /* has no outline; eg. space; don't draw it */
	unsigned int     nominal_w;
	unsigned int     nominal_h;
	unsigned int     atlas_x;
	unsigned int     atlas_y;
};

struct demo_atlas_t {
	unsigned int refcount;

	uint32_t tex_unit;
	uint32_t tex_name;
	uint32_t tex_w;
	uint32_t tex_h;
	uint32_t item_w;
	uint32_t item_h_q; /* height quantum */
	uint32_t cursor_x;
	uint32_t cursor_y;

	uint32_t *dump_buf;
};

struct demo_font_t {
	unsigned int   refcount;

	FT_Face        face;
	demo_atlas_t  *atlas;
	glyphy_arc_accumulator_t *acc;

	/* stats */
	unsigned int num_glyphs;
	double       sum_error;
	unsigned int sum_endpoints;
	double       sum_fetch;
	unsigned int sum_bytes;
};

static inline void die (const char *msg)
{
  fprintf (stderr, "%s\n", msg);
  exit (1);
}

demo_atlas_t *
demo_atlas_create (unsigned int w,
			 unsigned int h,
			 unsigned int item_w,
			 unsigned int item_h_quantum)
{
	demo_atlas_t *at = (demo_atlas_t *) calloc (1, sizeof (demo_atlas_t));
	at->tex_w = w;
	at->tex_h = h;
	at->item_w = item_w;
	at->item_h_q = item_h_quantum;
	at->cursor_x = 0;
	at->cursor_y = 0;

	at->dump_buf = (uint32_t*)malloc(w * h * 4);
	for(int i = 0;i<w*h;i++) at->dump_buf[i] = 0;

	printf("Allocated: %d %d %d %d\n", w, h, item_w, item_h_quantum);
	return at;
}

void demo_atlas_store( demo_atlas_t *at, int x, int y, int w, int h, glyphy_rgba_t *data){
	//printf("Storing at %d %d %d %d",x, y, w, h);
	uint32_t *input = (uint32_t*)data;
	for(int yc = 0; yc < h; yc++){
		for(int xc = 0; xc < w; xc++){
			int out_off = (yc+y)*at->tex_w + (xc + x);
			int in_off = (yc) * w + xc;
			uint32_t val = at->dump_buf[out_off] = input[in_off];
			//at->dump_buf[out_off] = 0;
		}
	}
}

void
demo_atlas_alloc (demo_atlas_t  *at,
			glyphy_rgba_t *data,
			unsigned int   len,
			unsigned int  *px,
			unsigned int  *py)
{
	uint32_t w, h, x, y;

	w = at->item_w;
	h = (len + w - 1) / w;

	if (at->cursor_y + h > at->tex_h) {
		/* Go to next column */
		at->cursor_x += at->item_w;
		at->cursor_y = 0;
	}

	if (at->cursor_x + w > at->tex_w){
		// lets double the width of the dump_buf
		int new_width = at->tex_w * 2;
		int new_size = new_width * at->tex_h;
		uint32_t *new_buf = (uint32_t *) malloc(new_size * 4);
		for(int i = 0;i<new_size;i++) new_buf[i] = 0;
		// copy old buffer
		for(int yc = 0; yc < at->tex_h; yc++){
			for(int xc = 0; xc < at->tex_w; xc++){
				new_buf[yc * new_width + xc] = at->dump_buf[yc * at->tex_w + xc];
			}
		}
		free(at->dump_buf);
		at->dump_buf = new_buf;
		at->tex_w = new_width;
		printf("Resized buffer: %d\n", at->tex_w);
	}

	//if (at->cursor_x + w <= at->tex_w &&
	//		at->cursor_y + h <= at->tex_h)
	//{
	x = at->cursor_x;
	y = at->cursor_y;
	at->cursor_y += (h + at->item_h_q - 1) & ~(at->item_h_q - 1);
	//} else
	//	die ("Ran out of atlas memory");

	//printf("%d %d\n", w*h, len);
	if (w * h == len){
		demo_atlas_store(at, x, y, w, h, data);
	}
	else {
		demo_atlas_store(at, x, y, w, h - 1, data);
		demo_atlas_store(at, x, y + h - 1, len - (w * (h - 1)), 1, data + w * (h - 1));
	}
	*px = x / at->item_w;
	*py = y / at->item_h_q;
}

demo_font_t *
demo_font_create (FT_Face       face,
			demo_atlas_t *atlas)
{
	demo_font_t *font = (demo_font_t *) calloc (1, sizeof (demo_font_t));
	font->refcount = 1;

	font->face = face;
	font->atlas = atlas;
	font->acc = glyphy_arc_accumulator_create ();

	font->num_glyphs = 0;
	font->sum_error  = 0;
	font->sum_endpoints  = 0;
	font->sum_fetch  = 0;
	font->sum_bytes  = 0;

	return font;
}

static glyphy_bool_t
accumulate_endpoint (glyphy_arc_endpoint_t         *endpoint,
				 std::vector<glyphy_arc_endpoint_t> *endpoints)
{
	endpoints->push_back (*endpoint);
	return true;
}

static void
encode_ft_glyph (demo_font_t      *font,
		 unsigned int      glyph_index,
		 double            tolerance_per_em,
		 glyphy_rgba_t    *buffer,
		 unsigned int      buffer_len,
		 unsigned int     *output_len,
		 unsigned int     *nominal_width,
		 unsigned int     *nominal_height,
		 glyphy_extents_t *extents,
		 double           *advance)
{
/* Used for testing only */
#define MIN_FONT_SIZE 10
#define SCALE  (1. * (1 << 0))
	FT_Face face = font->face;
	if (FT_Err_Ok != FT_Load_Glyph (face,
					glyph_index,
					FT_LOAD_NO_BITMAP |
					FT_LOAD_NO_HINTING |
					FT_LOAD_NO_AUTOHINT |
					FT_LOAD_NO_SCALE |
					FT_LOAD_LINEAR_DESIGN |
					FT_LOAD_IGNORE_TRANSFORM))
		die ("Failed loading FreeType glyph");

	if (face->glyph->format != FT_GLYPH_FORMAT_OUTLINE)
		die ("FreeType loaded glyph format is not outline");

	unsigned int upem = face->units_per_EM;
	double tolerance = upem * tolerance_per_em; /* in font design units */
	double faraway = double (upem) / (MIN_FONT_SIZE * M_SQRT2);
	std::vector<glyphy_arc_endpoint_t> endpoints;

 // printf("num glyphs: %d\n", face->glyph->outline.n_points);

	glyphy_arc_accumulator_reset (font->acc);
	glyphy_arc_accumulator_set_tolerance (font->acc, tolerance);
	glyphy_arc_accumulator_set_callback (font->acc,
							 (glyphy_arc_endpoint_accumulator_callback_t) accumulate_endpoint,
							 &endpoints);

	if (FT_Err_Ok != glyphy_freetype(outline_decompose) (&face->glyph->outline, font->acc))
		die ("Failed converting glyph outline to arcs");

	assert (glyphy_arc_accumulator_get_error (font->acc) <= tolerance);

#if 0
	/* Technically speaking, we want the following code,
	 * however, crappy fonts have crappy flags.  So we just
	 * fixup unconditionally... */
	if (face->glyph->outline.flags & FT_OUTLINE_EVEN_ODD_FILL)
		glyphy_outline_winding_from_even_odd (&endpoints[0], endpoints.size (), false);
	else if (face->glyph->outline.flags & FT_OUTLINE_REVERSE_FILL)
		glyphy_outline_reverse (&endpoints[0], endpoints.size ());
#else
	glyphy_outline_winding_from_even_odd (&endpoints[0], endpoints.size (), false);
#endif

	if (SCALE != 1.)
		for (unsigned int i = 0; i < endpoints.size (); i++)
		{
			endpoints[i].p.x /= SCALE;
			endpoints[i].p.y /= SCALE;
		}

	double avg_fetch_achieved;
	if (!glyphy_arc_list_encode_blob (&endpoints[0], endpoints.size (),
		buffer,
		buffer_len,
		faraway / SCALE,
		4, /* UNUSED */
		&avg_fetch_achieved,
		output_len,
		nominal_width,
		nominal_height,
		extents))
		die ("Failed encoding arcs");

	glyphy_extents_scale (extents, 1. / upem, 1. / upem);
	glyphy_extents_scale (extents, SCALE, SCALE);

	*advance = face->glyph->metrics.horiAdvance / (double) upem;

	if (0)
		printf ("gid%3u: endpoints%3d; err%3g%%; tex fetch%4.1f; mem%4.1fkb\n",
		glyph_index,
		(unsigned int) glyphy_arc_accumulator_get_num_endpoints (font->acc),
		round (100 * glyphy_arc_accumulator_get_error (font->acc) / tolerance),
		avg_fetch_achieved,
		(*output_len * sizeof (glyphy_rgba_t)) / 1024.);

	font->num_glyphs++;
	font->sum_error += glyphy_arc_accumulator_get_error (font->acc) / tolerance;
	font->sum_endpoints += glyphy_arc_accumulator_get_num_endpoints (font->acc);
	font->sum_fetch += avg_fetch_achieved;
	font->sum_bytes += (*output_len * sizeof (glyphy_rgba_t));
}

static void
_demo_font_upload_glyph (demo_font_t *font,
			 unsigned int glyph_index,
			 glyph_info_t *glyph_info,
			 double tolerance)
{
	glyphy_rgba_t buffer[4096 * 16];
	unsigned int output_len;

	encode_ft_glyph (font,
		glyph_index,
		tolerance,
		buffer, sizeof(buffer) / sizeof(glyphy_rgba_t),
		&output_len,
		&glyph_info->nominal_w,
		&glyph_info->nominal_h,
		&glyph_info->extents,
		&glyph_info->advance);

	glyph_info->is_empty = glyphy_extents_is_empty (&glyph_info->extents);

	if (!glyph_info->is_empty)
		demo_atlas_alloc (font->atlas, buffer, output_len,
					&glyph_info->atlas_x, &glyph_info->atlas_y);
}

void demo_font_print_stats (demo_font_t *font)
{
	printf ("%3d glyphs; avg num endpoints%6.2f; avg error%5.1f%%; avg tex fetch%5.2f; avg %5.2fkb per glyph\n",
	font->num_glyphs,
	(double) font->sum_endpoints / font->num_glyphs,
	100. * font->sum_error / font->num_glyphs,
	font->sum_fetch / font->num_glyphs,
	font->sum_bytes / 1024. / font->num_glyphs);
}

void add_glyph_to_lut_and_atlas ( unsigned int unicode,
	demo_font_t          *font,
	double                font_size,
	char                 *lut,
	size_t                *lut_size, 
	double tolerance)
{
	FT_Face face = font->face;

	unsigned int glyph_index = FT_Get_Char_Index (face, unicode);
	if(glyph_index == 0) return;
	glyph_info_t gi;
	_demo_font_upload_glyph (font, glyph_index, &gi, tolerance);

	// lets output our lut
	if(!gi.is_empty){
		*((uint32_t*)&lut[*lut_size]) = unicode, *lut_size += sizeof(uint32_t);
		*((float*)&lut[*lut_size]) = (float)gi.extents.min_x, *lut_size += sizeof(float);
		*((float*)&lut[*lut_size]) = (float)gi.extents.min_y, *lut_size += sizeof(float);
		*((float*)&lut[*lut_size]) = (float)gi.extents.max_x, *lut_size += sizeof(float);
		*((float*)&lut[*lut_size]) = (float)gi.extents.max_y, *lut_size += sizeof(float);
		*((float*)&lut[*lut_size]) = (float)gi.advance, *lut_size += sizeof(float);
		*((uint8_t*)&lut[*lut_size]) = (uint8_t)gi.nominal_w, *lut_size += sizeof(uint8_t);
		*((uint8_t*)&lut[*lut_size]) = (uint8_t)gi.nominal_h, *lut_size += sizeof(uint8_t);
		*((uint8_t*)&lut[*lut_size]) = (uint8_t)gi.atlas_x, *lut_size += sizeof(uint8_t);
		*((uint8_t*)&lut[*lut_size]) = (uint8_t)gi.atlas_y, *lut_size += sizeof(uint8_t);
	}
}
void demo_write_gpu_font(const char *filename, char *lut_buf, size_t lut_len, demo_atlas_t *at){

	// alright lets dump our vertexbuffer!
	FILE *f = fopen(filename, "wb");
	uint32_t ftver = (uint32_t) 0x01F01175; // spelling fonts ;)
	uint32_t ilen = (uint32_t) lut_len; // length of the atlas index chunk
	uint16_t width = at->tex_w;
	uint16_t height = at->tex_h;
	uint16_t item_w = at->item_w;
	uint16_t item_q = at->item_h_q;

	fwrite((const char *)&ftver, 4, 1, f);
	fwrite((const char *)&width, 2, 1, f);
	fwrite((const char *)&height, 2, 1, f);
	fwrite((const char *)&item_w, 2, 1, f);
	fwrite((const char *)&item_q, 2, 1, f);
	fwrite((const char *)&lut_len, 4, 1, f);
	fwrite((const char *)lut_buf, lut_len, 1, f);
	fwrite((const char *)at->dump_buf, at->tex_w * at->tex_h * 4, 1, f);
	fclose(f);
}


#define TOLERANCE (1./2048)


int main (int argc, char** argv)
{
	if(argc<5){
		printf("Glyphy font converter, ttf->glf\nUsage:\n  glyphy <inputfont> <from unicode> <to unicode> <output>\nExample:\n  glyphy myfont.ttf 0 16000 myfont.glf\n");
		return -1;
	}

	FT_Library ft_library;
	FT_Init_FreeType (&ft_library);
	FT_Face ft_face;
//#ifdef EMSCRIPTEN
//# include "DroidSans.c"
//  FT_New_Memory_Face (ft_library, (const FT_Byte *) DroidSans, sizeof (DroidSans), 0/*face_index*/, &ft_face);
//#else
	FT_New_Face (ft_library, argv[1], 0/*face_index*/, &ft_face);
//#endif
	if (!ft_face)
		die ("Failed to open font file");

	demo_atlas_t *atlas = demo_atlas_create(128,1024,64,8);
	demo_font_t *font = demo_font_create (ft_face, atlas);

	int start = atoi(argv[2]);
	int end = atoi(argv[3]);

	printf("Converting %s to %s from unicode %d to %d\n", argv[1],argv[4],start,end);

	char *lut_buf = (char*)malloc(500000);
	size_t size = 0;
	for(int i = start;i<end;i++){
		add_glyph_to_lut_and_atlas (i, font, 1, lut_buf, &size, TOLERANCE);
	}

	demo_write_gpu_font(argv[4], lut_buf, size, atlas);
	printf("Done\n");
}