// ==UserScript==
// @name         100% Pizza Search
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  100% Pizza kereső felület
// @include      https://www.100szazalekpizza.hu/*
// @author       Peter Hegedűs
// @match        https://www.tampermonkey.net/index.php?version=4.9.5941&ext=fire&updated=true
// @grant        none
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// ==/UserScript==

(function($) {
    let search = {
        init: function(){
            if(location.pathname.search(/kategoria/)==-1){
                return;
            }
            this.addMyStyle();
            this.setProducts();
            this.insertSearchForm();
        },
        addMyStyle: function(){
            console.debug('Add Search Style');
            let s = $('<style></style>');
            s.html([
                '.form-element{ border:none; padding: 11px 18px; font-size: 11px; font-weight: bold; border-radius: 10px; }',
                '.product { color: #1a1c1f; display: inline-block; margin-right: 10px; border-right: 1px solid; padding-right: 10px; border-color: #999; }',
                '.product > label { color: #1a1c1f; padding: 0; }',
                '.product > .ingredient { width: 200px; display: inline-block; }',
                '.switch { position: relative; display: inline-block; width: 30px; height: 16px; margin-left: 5px; }',
                '.switch input { opacity: 0; width: 0; height: 0; }',
                '.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; -webkit-transition: .4s; transition: .4s; }',
                '.slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 2px; bottom: 2px; background-color: white; -webkit-transition: .4s; transition: .4s; }',
                '.switch.color-green > .slider { background-color: #b6ceb5; }',
                '.switch.color-green > input:checked + .slider { background-color: green; }',
                '.switch.color-green > input:focus + .slider { box-shadow: 0 0 1px green; }',
                '.switch.color-red > .slider { background-color: #cd9494; }',
                '.switch.color-red > input:checked + .slider { background-color: red; }',
                '.switch.color-red > input:focus + .slider { box-shadow: 0 0 1px red; }',
                'input:checked + .slider:before { -webkit-transform: translateX(14px); -ms-transform: translateX(14px); transform: translateX(14px); }',
                '.slider.round { border-radius: 24px; }',
                '.slider.round:before { border-radius: 50%; }',
                '.search-filter > .products { display: none; }',
                '.search-filter > h4 { cursor: pointer; }'
            ].join(''));
            $('head').append(s)
        },
        insertSearchForm: function(){
            console.debug('Insert Search form');
            let form = $('<form></form>');
            let title = $('<h2>Kereső</h2>');
            let key = $('<input type="text" placeholder="Kifejezés" class="form-element">');
            title.css('text-transform','uppercase').css('color','#d21010');
            key.keyup(function(){
                search.search($(this).val());
            });
            form.css('margin-left','10px').css('margin-bottom','20px').append(title).append(key);
            this.inserIngredientSwitches(form);
            form.insertAfter('.termekek > .focimek');
        },
        inserIngredientSwitches: function(form){
            let div_container = $('<div class="search-filter"></div>');
            let div = $('<div class="products"></div>');
            let filter = $('<h4>Szűrő</h4>');
            let icon = $('<span>+</span>');
            filter.append(icon).click(function(){
                filter.toggleClass('open');
                div.slideToggle();
                icon.html((filter.hasClass('open') ? '-' : '+'));
            });
            div_container.append(filter);
            div_container.css('margin-top', '10px');
            Object.keys(search.ingredients).sort().forEach(function(index, i){
                if(
                    index.replace(/\s+/g," ")=='2 féléből 1 db pizza: kérjük írd le megjegyzésbe' ||
                    index.replace(/\s+/g," ")=='hogy melyik 2 ízt szeretnéd!'
                ){
                    return;
                }
                let label = $('<label class="ingredient"></label>');
                let span = $('<span class="product"></span>');
                let need = search.crateSwitch('green');
                let forbid = search.crateSwitch('red');
                search.setSwitch(need, forbid, index);
                label.html(index);
                span.append(label).append(need).append(forbid);
                div.append(span);
            });
            div_container.append(div);
            form.append(div_container);
        },
        crateSwitch: function(color){
            let sw = $('<label class="switch"></lable>');
            sw.addClass('color-'+color);
            let input = $('<input type="checkbox">');
            let slider = $('<span class="slider round"></span>');
            sw.append(input).append(slider).find('input');
            return sw;
        },
        setSwitch: function(need, forbid,key){
            need.find('input').attr('data-key',key);
            forbid.find('input').attr('data-key','!'+key);
            need.find('input').change(function(){
                forbid.find('input').prop('checked',false);
                let keys=[];
                $('.switch').find('input:checked').each(function(){
                    keys.push($(this).data('key'));
                });
                search.search(keys.join(','));
            });
            forbid.find('input').change(function(){
                need.find('input').prop('checked',false);
                let keys=[];
                $('.switch').find('input:checked').each(function(){
                    keys.push($(this).data('key'));
                });
                search.search(keys.join(','));
            });
        },
        products: {},
        ingredients: {},
        setProducts: function(){
            console.debug('Set Search Products');
            let productElements = $('.termekspan');
            productElements.each(function(){
                let data = $(this).find('table > tbody > tr:nth-child(2) > td > div:first-child > table > tbody > tr:first-child > td');
                let product = {
                    name: data.find('div:first-child').text(),
                    ingredients: data.find('div:nth-child(2)').text().trim().replace(/,\s+/g,',').split(','),
                    ingredients_text: data.find('div:nth-child(2)').text().trim().replace(/,\s+/g,','),
                    text: data.text().replace(/\n+/g," "),
                    origin: $(this)
                };
                if(product.name.toLowerCase().search(/menü/) == -1){
                    product.ingredients.forEach(function(ingredient){
                        let key = ingredient.toLowerCase().replace(/-/g,' ').replace(/\s+/g,' ');
                        if(typeof search.ingredients[ingredient.toLowerCase()] === 'undefined'){
                            search.ingredients[key]=[];
                        }
                        search.ingredients[key].push(product.name.toLowerCase());
                    });
                }
                search.products[product.name.toLowerCase()] = product;
            });
            Object.keys(search.products).forEach(function(index){
                if(index.search(/menü/) > -1){
                    search.products[index].ingredients = search.products[index.replace(/\s+menü/,"")].ingredients;
                    search.products[index].ingredients_text = search.products[index.replace(/\s+menü/,"")].ingredients_text;
                }
            });
        },
        search: function(key){
            $('.termekspan').show();
            let keys=key.replace(/,\s+/g,',').replace(/\s+/g," ").split(",");
            Object.keys(search.products).forEach(function(index){
                let product = search.products[index];
                keys.forEach(function(key){
                    if(
                        key.search(/^!/)==-1 &&
                        product.name.toLowerCase().replace(/,\s+/g,',').replace(/\s+/g," ").replace(/-/g,' ').search(key)==-1 &&
                        product.text.replace(/,\s+/g,',').replace(/\s+/g," ").replace(/-/g,' ').toLowerCase().search(key)==-1 &&
                        product.ingredients_text.replace(/,\s+/g,',').replace(/\s+/g," ").replace(/-/g,' ').toLowerCase().search(key)==-1
                    ){
                        product.origin.hide();
                    }
                    if(
                        key.search(/^!/)!=-1 && (
                            product.name.toLowerCase().replace(/,\s+/g,',').replace(/\s+/g," ").replace(/-/g,' ').search(key.replace(/^!/,''))!=-1 ||
                            product.text.replace(/,\s+/g,',').replace(/\s+/g," ").replace(/-/g,' ').toLowerCase().search(key.replace(/^!/,''))!=-1 ||
                            product.ingredients_text.replace(/,\s+/g,',').replace(/\s+/g," ").replace(/-/g,' ').toLowerCase().search(key.replace(/^!/,''))!=-1
                        )
                    ){
                        product.origin.hide();
                    }
                });
            });
        }
    };

    search.init();
})(jQuery);
